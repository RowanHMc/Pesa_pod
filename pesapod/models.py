from django.db import models
import uuid
from django.conf import settings

# Create your models here.

class Chama(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    name = models.CharField(max_length=150)
    description = models.TextField(
        blank=True,
    )

    created_by = models.ForeignKey(
      settings.AUTH_USER_MODEL,  
      on_delete=models.PROTECT,
      related_name="created_chamas",
    )
    
