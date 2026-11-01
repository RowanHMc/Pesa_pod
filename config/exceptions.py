from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler

def api_exception_handler(exc, context):
    
    response = exception_handler(exc, context)
    
    if response is None or not isinstance(exc, ValidationError):
        return response

    data = response.data

    if isinstance(data, list):
        if len(data) == 1:
            response.data = {"detail": data[0]}
        elif len(data) > 1:
            response.data = {"detail": data}
        else:
            response.data = {"detail": "Invalid input."} # Fallback for empty list

    elif isinstance(data, dict):
        if set(data) == {"non_field_errors"}:
            messages = data["non_field_errors"]
            if len(messages) == 1:
                response.data = {"detail": messages[0]}
            elif len(messages) > 1:
                response.data = {"detail": messages}
            else:
                response.data = {"detail": "Invalid input."}
        

    return response

