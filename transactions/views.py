from django.shortcuts import render
from django.db import transaction

from rest_framework import mixins, viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.decorators import action
from rest_framework.response import Response

from pesapod.models import Membership, Chama
from .models import SavingsCycle, SavingsRound, Contribution
from .serializers import SavingsCycleSerializer, SavingsRoundSerializer

import calendar

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
                "Only chairperson can create a sacing cycle"
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
        # if cycle.status != SavingsCycle.Status.DRAFT:
        #     raise ValidationError("The cycle must be in draft status.")
        if cycle.status not in [
            SavingsCycle.Status.DRAFT,
            SavingsCycle.Status.ACTIVE,
        ]:
            raise ValidationError("This cycle cannot create Rounds.")

        previous_round = cycle.rounds.order_by("-round_number").first()
        next_number =(
            previous_round.round_number + 1
            if previous_round else 1
        )

        if next_number > cycle.number_of_rounds:
            raise ValidationError(
                "The cycle has reached its maximin rounds"
            )
        if previous_round and previous_round.status != SavingsRound.Status.COMPLETED:
            raise ValidationError("Complete previous round before creating another")
        
        # if cycle.rounds.exists():
        #     raise ValidationError("Rounds have already been generated.")

        # payout_order = request.data.get("payout_order")

        # if not isinstance(payout_order, list) or not all(
        #     type(member_id) is int for member_id in payout_order
        # ):
        #     raise ValidationError(
        #         "payout_order must be a list of membership IDs."
        #     )

        member_id = request.data.get("recipient")

        if isinstance(member_id, bool) or not str(member_id).isdigit():
            raise ValidationError("Have Valid Membership ID")

        recipient = Membership.objects.filter(
            id = member_id,
            chama =cycle.chama,
            is_active =True,
        ).first()

        if not recipient:
            raise ValidationError("Recipient must be an active Member")

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
        

        # member_ids = set(Membership.objects.filter(
        #     chama=cycle.chama,
        #     is_active=True,
        # ).values_list("id", flat=True))

        # if len(member_ids) < 2:
        #     raise ValidationError("A cycle requires at least two members.")

        # if len(payout_order) != len(member_ids) or set(payout_order) != member_ids:
        #     raise ValidationError(
        #         "Provide every active member exactly once."
        #     )

        round_ = SavingsRound.objects.create(
            cycle=cycle,
            round_number = next_number,
            recipient =recipient,
            due_date =due_date,
        )
        # rounds = []

        # for index, member_id in enumerate(payout_order):
        #     if cycle.frequency == SavingsCycle.Frequency.WEEKLY:
        #         due_date = cycle.start_date + timedelta(weeks=index)

        #     else:
        #         month_index = cycle.start_date.month - 1 + index
        #         year = cycle.start_date.year + month_index // 12
        #         month = month_index % 12 + 1
        #         day = min(
        #             cycle.start_date.day,
        #             calendar.monthrange(year, month)[1],
        #         )
        #         due_date = cycle.start_date.replace(
        #             year=year, month=month, day=day
        #         )

        #     rounds.append(SavingsRound(
        #         cycle=cycle,
        #         round_number=index + 1,
        #         recipient_id=member_id,
        #         due_date=due_date,
        #     ))

        # SavingsRound.objects.bulk_create(rounds)

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
            raise ValidationError("Cycle must be in draft status.")

        if SavingsCycle.objects.filter(
            chama=cycle.chama,
            status=SavingsCycle.Status.ACTIVE,
        ).exclude(pk=cycle.pk).exists():
            raise ValidationError("Another cycle is already active.")

        members = list(Membership.objects.filter(
            chama=cycle.chama,
            is_active=True,
        ))

        rounds = list(cycle.rounds.order_by("round_number"))

        member_ids = {member.id for member in members}
        recipient_ids = {round_.recipient_id for round_ in rounds}

        if len(members) < 2:
            raise ValidationError("At least two members are required.")

        if (
            len(rounds) != len(members)
            or recipient_ids != member_ids
            or [r.round_number for r in rounds]
            != list(range(1, len(rounds) + 1))
        ):
            raise ValidationError(
                "Rounds must cover every active member exactly once."
            )

        if Contribution.objects.filter(round__cycle=cycle).exists():
            raise ValidationError(
                "Contributions have already been generated."
            )

        contributions = [
            Contribution(
                round=round_,
                membership=member,
                amount_due=cycle.contribution_amount,
            )
            for round_ in rounds
            for member in members
        ]

        Contribution.objects.bulk_create(contributions)

        cycle.status = SavingsCycle.Status.ACTIVE
        cycle.save(update_fields=["status"])

        return Response({
            "detail": "Savings cycle activated successfully.",
            "status": cycle.status,
            "rounds": len(rounds),
            "contributions_created": len(contributions),
        })




