# Pesa Pod

***A digital workspace for managing chama savings.***

Pesa Pod helps chamas organize their rotating savings activities
in one place. Members can follow their savings cycle and payout
schedule, report contributions made outside the platform, and track
payment confirmations. Chama leaders can manage membership and cycle
administration, while Treasurers review payment reports and record
payouts.

The platform does not collect, hold, or process members' money.
Contributions and payouts take place outside Pesa Pod; the application
provides the records and coordination layer.

## Features

-   Chama creation and membership management.
-   Role-based access for Chairpersons, Treasurers, and Members.
-   Invitations, member administration, and leadership changes.
-   Savings cycle creation, activation, and payout scheduling.
-   Contribution tracking and payment-report review.
-   Payout recording and recipient confirmation.
-   Dashboard views for chama administration and member activity.

> **Development status:** The member-facing contribution obligations and
> payment-reporting experience is being finalized as part of the MVP.

## Technology Stack

-   **Backend:** Python, Django, Django REST Framework
-   **Frontend:** React, Vite, Tailwind CSS
-   **HTTP client:** Axios
-   **UI icons:** Lucide React
-   **Deployment:** Render

## Quick Start

Pesa Pod contains a Django backend and a React frontend.

1.  Clone the repository.

    ``` bash
    git clone <repository-url>
    cd Pesa_Pod
    ```

2.  Install the backend requirements and configure the required
    environment variables.

3.  Start the Django development server.

4.  Install the frontend dependencies from `frontend/` and configure the
    API base URL.

5.  Start the Vite development server.

Use the environment examples supplied with the project where available.
Keep credentials and secret keys out of version control.

## Project Structure

``` text
Pesa_Pod/
├── accounts/
├── config/
├── notifications/
├── pesapod/
├── transactions/
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       ├── hooks/
│       └── pages/
├── .github/
├── manage.py
├── requirements.txt
└── LICENSE
```

## Contributions

Contributions, ideas, and feedback are welcome.

1.  Fork the repository.
2.  Create a feature branch.
3.  Make focused changes and test them locally.
4.  Use clear commit messages.
5.  Open a pull request describing the change.

For larger changes, open an issue first so the proposed approach can be
discussed. Please avoid committing secrets, personal data, or production
credentials.

## Deployment

The backend is deployed on Render:

-  https://pesa-pod.onrender.com/

## Future developments 

## License

See the `LICENSE` file for the project's licensing terms.

## Acknowledgements

Built as a practical project exploring digital tools for chama and
rotating savings group management.

## Presentation Document Link
- https://1drv.ms/p/c/8861886c4d95b6cd/IQCPm1dRSwSIT6nW9Y9vmDn2AY-2t9w4OpcNCkctLZ0lUwE?e=wiSJN1


## Author
Rowan Hadegu
