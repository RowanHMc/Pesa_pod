from django.shortcuts import render
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from rest_framework import mixins, viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.decorators import action
from rest_framework.response import Response

from pesapod.models import Membership, Chama
from .models import SavingsCycle, SavingsRound, Contribution, Transaction
from .serializers import SavingsCycleSerializer, SavingsRoundSerializer, ContributionSerializer, TransactionSerializer, TransactionRejectionSerializer

import calendar
import secrets

from datetime import timedelta

# Create your views here.

class SavingsCycleViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = SavingsCycleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SavingsCycle.objects.filter(
            chama__memberships__user=self.request.user,
            chama__memberships__is_active=True,
            chama__is_active=True,
        ).distinct()

    @transaction.atomic
    def perform_create(self, serializer):
        chama = serializer.validated_data["chama"]

        # Lock the chama when validating cycle creation
        chama = type(chama).objects.select_for_update().get(pk=chama.pk)

        is_chairperson = Membership.objects.filter(
            chama=chama,
            user=self.request.user,
            role=Membership.Role.CHAIRPERSON,
            is_active=True,
        ).exists()

        if not is_chairperson:
            raise PermissionDenied(
                "Only chairperson can create a saving cycle"
            )
        if not chama.is_active:
            raise ValidationError(
                "This Chama is inactive"
            )
        if SavingsCycle.objects.filter(
            chama=chama,
            status__in=[
                SavingsCycle.Status.DRAFT,
                SavingsCycle.Status.ACTIVE,
            ],
        ).exists():
            raise ValidationError(
                "Chama already has an unfinished cycle"
            )

        serializer.save(created_by=self.request.user)

    @action(
        detail=True,
        methods=["post"],
        url_path="generate-rounds"
    )
    @transaction.atomic
    def generate_rounds(self, request, pk=None):
        cycle = self.get_object()

        # Lock the chama and cycle during generation
        Chama.objects.select_for_update().get(pk=cycle.chama_id)
        cycle = SavingsCycle.objects.select_for_update().get(pk=cycle.pk)

        if not Membership.objects.filter(
            chama=cycle.chama,
            user=request.user,
            role=Membership.Role.CHAIRPERSON,
            is_active=True,
        ).exists():
            raise PermissionDenied(
                "Only the Chairperson can generate rounds."
                )
        if cycle.status != SavingsCycle.Status.ACTIVE:
            raise ValidationError("The savings cycle must be active.")
       
        previous_round = cycle.rounds.order_by("-round_number").first()

        if not previous_round:
            raise ValidationError("The first round has not been created")
        if previous_round.status != SavingsRound.Status.COMPLETED:
            raise ValidationError("complete the previous round first")
       
        next_number = previous_round.round_number + 1

        if next_number > cycle.number_of_rounds:
            raise ValidationError(
                "The cycle has reached its maximin rounds"
            )
        

        payout_order = cycle.payout_order

        if not payout_order:
            raise ValidationError("Payout order is missing.")

        recipient_index = (next_number - 1) % len(payout_order)
        recipient_id = payout_order[recipient_index]

        if cycle.frequency == SavingsCycle.Frequency.WEEKLY:
            due_date = cycle.start_date + timedelta(
                weeks=next_number -1
            )
        else:
            month_index = cycle.start_date.month -1 + next_number -1
            year = cycle.start_date.year + month_index // 12
            month = month_index % 12 + 1
            day = min(
                cycle.start_date.day,
                calendar.monthrange(year, month)[1],
            )
            due_date = cycle.start_date.replace(
                year=year, month=month, day=day
            )
        

        round_ = SavingsRound.objects.create(
            cycle=cycle,
            round_number = next_number,
            recipient_id =recipient_id,
            due_date =due_date,
        )
       
        members = Membership.objects.filter(
        chama=cycle.chama,
        id__in=payout_order,
        )
        
        Contribution.objects.bulk_create([
        Contribution(
            round=round_,
            membership=member,
            amount_due=cycle.contribution_amount,
        )
        for member in members
        ])
        
        return Response(
            SavingsRoundSerializer(round_).data,
            status=status.HTTP_201_CREATED,
        )


    @action(detail=True, methods=["post"], url_path="activate")
    @transaction.atomic
    def activate_cycle(self, request, pk=None):
        cycle = self.get_object()

        # Lock chama and cycle during activation
        Chama.objects.select_for_update().get(pk=cycle.chama_id)
        cycle = SavingsCycle.objects.select_for_update().get(pk=cycle.pk)

        if not Membership.objects.filter(
            chama=cycle.chama,
            user=request.user,
            role=Membership.Role.CHAIRPERSON,
            is_active=True,
        ).exists():
            raise PermissionDenied(
                "Only the Chairperson can activate a cycle."
            )

        if cycle.status != SavingsCycle.Status.DRAFT:
            raise ValidationError("Cycle must be in draft status to be activated.")
        if cycle.rounds.exists():
            raise ValidationError("This cycle has rounds use a new draft cycle")
        if SavingsCycle.objects.filter(
            chama=cycle.chama,
            status=SavingsCycle.Status.ACTIVE,
        ).exclude(pk=cycle.pk).exists():
            raise ValidationError("Another cycle is already active.")

        members = list(Membership.objects.filter(
            chama=cycle.chama,
            is_active=True,
        ).order_by("id"))

 
        if len(members) < 2:
            raise ValidationError("At least two members are required.")
        if cycle.number_of_rounds < 1:
            raise ValidationError(
                "A savings cycle must have at least one round."
                )
        payout_order = [member.id for member in members]
        secrets.SystemRandom().shuffle(payout_order)

        cycle.payout_order = payout_order
        cycle.status = SavingsCycle.Status.ACTIVE
        cycle.save(update_fields=["payout_order", "status"])

        first_round = SavingsRound.objects.create(
            cycle = cycle,
            round_number = 1,
            recipient_id = payout_order[0],
            due_date=cycle.start_date,
        )

        Contribution.objects.bulk_create([
            Contribution(
                round=first_round,
                membership = member,
                amount_due = cycle.contribution_amount,
            )
            for member in members
        ])

        return Response({
            "detail": "Savings cycle activated successfully.",
            "status": cycle.status,
            "payout_order": payout_order,
            "current_round": 1,
            "recipient": payout_order[0],
            "contributions_created": len(members),
        })

class ContributionViewSet(
        mixins.ListModelMixin,
        mixins.RetrieveModelMixin,
        viewsets.GenericViewSet,
):
    serializer_class = ContributionSerializer
    permission_classes =[IsAuthenticated]

    def get_queryset(self):
        return Contribution.objects.filter(
            membership__user = self.request.user,
        ).select_related(
            "membership",
            "round",
            "round__cycle"
        )

class TransansactionViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,   
):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        treasurer_chama_ids = Membership.objects.filter(
            user=self.request.user,
            is_active=True,
            role__in=[
                Membership.Role.TREASURER,
                Membership.Role.CHAIRPERSON,
            ],
        ).values_list("chama_id", flat=True)

        queryset = Transaction.objects.filter(
            Q(contribution__membership__user=self.request.user)
            | Q(contribution__round__cycle__chama_id__in=treasurer_chama_ids)
        ).select_related(
            "contribution",
            "contribution__membership",
            "contribution__round",
            "contribution__round__cycle",
            "reported_by",
            "reviewed_by",
        ).distinct()

        requested_status = self.request.query_params.get("status")

        if requested_status in Transaction.Status.values:
            queryset = queryset.filter(status=requested_status)

        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        contribution = serializer.validated_data["contribution"]

        contribution = Contribution.objects.select_for_update().select_related(
            "membership",
            "membership__chama",
            "round__cycle",
        ).get(pk=contribution.pk)

        membership = contribution.membership
        cycle = contribution.round.cycle

        # The member can only report their own contribution.
        if membership.user_id != self.request.user.id:
            raise PermissionDenied(
                "You can only report payment for your own contribution."
            )

        if not membership.is_active:
            raise PermissionDenied(
                "Your membership is not active."
            )

        if membership.chama_id != cycle.chama_id:
            raise ValidationError(
                "This contribution does not belong to the cycle's Chama."
            )

        if not membership.chama.is_active:
            raise ValidationError(
                "This Chama is inactive."
            )

        if cycle.status != SavingsCycle.Status.ACTIVE:
            raise ValidationError(
                "The savings cycle is not active."
            )

        if contribution.status != Contribution.Status.PENDING:
            raise ValidationError(
                "This contribution is not pending."
            )

        if contribution.round.status in [
            SavingsRound.Status.COMPLETED,
            SavingsRound.Status.CANCELLED,
        ]:
            raise ValidationError(
                "This round is no longer accepting payment reports."
            )

        # Prevent multiple pending or confirmed reports.
        existing_transaction = Transaction.objects.filter(
            contribution=contribution,
            status__in=[
                Transaction.Status.PENDING,
                Transaction.Status.CONFIRMED,
            ],
        ).exists()

        if existing_transaction:
            raise ValidationError(
                "A payment report already exists for this contribution."
            )

        serializer.save(
            contribution=contribution,
            reported_by=self.request.user,
        )

    def get_review_context(self, request):
        transaction_record = self.get_object()

        chama_id = transaction_record.contribution.round.cycle.chama_id

        # Lock records in a consistent order before reviewing.
        Chama.objects.select_for_update().get(pk=chama_id)

        cycle = SavingsCycle.objects.select_for_update().get(
            pk=transaction_record.contribution.round.cycle_id
        )

        round_ = SavingsRound.objects.select_for_update().get(
            pk=transaction_record.contribution.round_id
        )

        contribution = Contribution.objects.select_for_update().get(
            pk=transaction_record.contribution_id
        )

        transaction_record = Transaction.objects.select_for_update().get(
            pk=transaction_record.pk
        )

        # Only the active Treasurer can review payments.
        is_treasurer = Membership.objects.filter(
            chama_id=chama_id,
            user=request.user,
            role=Membership.Role.TREASURER,
            is_active=True,
        ).exists()

        if not is_treasurer:
            raise PermissionDenied(
                "Only the Treasurer can review payment reports."
            )

        # Prevent a Treasurer from reviewing their own payment report.
        # if transaction_record.reported_by_id == request.user.id:
        #     raise PermissionDenied(
        #         "You cannot review your own payment report."
        #     )

        if cycle.status != SavingsCycle.Status.ACTIVE:
            raise ValidationError(
                "The savings cycle is not active."
            )

        if round_.status in [
            SavingsRound.Status.COMPLETED,
            SavingsRound.Status.CANCELLED,
        ]:
            raise ValidationError(
                "This round can no longer be reviewed."
            )

        if contribution.status != Contribution.Status.PENDING:
            raise ValidationError(
                "This contribution is no longer pending."
            )

        if transaction_record.status != Transaction.Status.PENDING:
            raise ValidationError(
                "This payment report has already been reviewed."
            )

        return transaction_record, contribution, round_, cycle

    @action(detail=True, methods=["post"], url_path="confirm")
    @transaction.atomic
    def confirm_payment(self, request, pk=None):
        (
            transaction_record,
            contribution,
            round_,
            cycle,
        ) = self.get_review_context(request)

        now = timezone.now()

        # Update the transaction audit details.
        transaction_record.status = Transaction.Status.CONFIRMED
        transaction_record.reviewed_by = request.user
        transaction_record.reviewed_at = now
        transaction_record.rejection_reason = ""

        transaction_record.save(update_fields=[
            "status",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
        ])

        # Mark the contribution as paid.
        contribution.status = Contribution.Status.PAID
        contribution.save(update_fields=["status"])

        # Check whether every contribution in this round is paid.
        pending_contributions = Contribution.objects.filter(
            round=round_,
            status=Contribution.Status.PENDING,
        ).exists()

        if not pending_contributions:
            round_.status = SavingsRound.Status.COMPLETED
            round_.save(update_fields=["status"])

            # Complete the cycle if this was its final round.
            if round_.round_number >= cycle.number_of_rounds:
                cycle.status = SavingsCycle.Status.COMPLETED
                cycle.save(update_fields=["status"])

        return Response(
            TransactionSerializer(transaction_record).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="reject")
    @transaction.atomic
    def reject_payment(self, request, pk=None):
        rejection_serializer = TransactionRejectionSerializer(
            data=request.data
        )
        rejection_serializer.is_valid(raise_exception=True)

        (
            transaction_record,
            contribution,
            round_,
            cycle,
        ) = self.get_review_context(request)

        transaction_record.status = Transaction.Status.REJECTED
        transaction_record.reviewed_by = request.user
        transaction_record.reviewed_at = timezone.now()
        transaction_record.rejection_reason = (
            rejection_serializer.validated_data["rejection_reason"]
        )

        transaction_record.save(update_fields=[
            "status",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
        ])

        return Response(
            TransactionSerializer(transaction_record).data,
            status=status.HTTP_200_OK,
        )




