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




