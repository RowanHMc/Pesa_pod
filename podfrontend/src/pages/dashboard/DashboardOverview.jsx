import { Link, useOutletContext } from "react-router-dom";
import { Activity, ArrowRight, CreditCard, Mail, Users } from "lucide-react";
import useContributions from "../../hooks/useContributions";
import useInvitations from "../../hooks/useInvitations";

const cards = [
    {
        title: "My Chamas",
        description: "Choose a chama to view its members and manage the group.",
        to: "/dashboard/chamas",
        icon: Users,
    },
    {
        title: "Active Cycles",
        description: "View savings rounds, contributions, and payouts.",
        to: "/dashboard/cycles",
        icon: Activity,
    },
    {
        title: "Invitations",
        description: "View and respond to your chama invitations.",
        to: "/dashboard/invitations",
        icon: Mail,
    },
    {
        title: "Payment History",
        description: "Review your payment records and their status.",
        to: "/dashboard/payments",
        icon: CreditCard,
    },
];

export default function DashboardOverview() {
    const { user } = useOutletContext();
    const { contributions, loading: contributionsLoading, error: contributionsError,} = useContributions();
    const {invitations, loading: invitationsLoading, error: invitationsError,} = useInvitations("awaiting_acceptance");
    const attentionItems = [
        {
            label: "Pending contributions",
            count: contributions.filter(({ status }) => status === "pending").length,
            loading: contributionsLoading,
            error: contributionsError,
            to: "/dashboard/cycles",
        },
        {
            label: "Invitations awaiting your response",
            count: invitations.length,
            loading: invitationsLoading,
            error: invitationsError,
            to: "/dashboard/invitations",
        },
    ];

    const visibleItems = attentionItems.filter(
    ({ count, loading, error }) => count > 0 || loading || error,
    );
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">
                Welcome back, {user.first_name || user.username}
            </h1>
        
            <nav aria-label="Dashboard pages" className="grid gap-4 sm:grid-cols-2">
                {cards.map(({ title, description, to, icon: Icon }) => (
                    <Link
                        key={to}
                        to={to}
                        className="group flex items-start gap-4 rounded-xl border border-slate-100 bg-white p-5 transition hover:border-powder hover:bg-powder-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
                    >
                        <span className="shrink-0 rounded-lg bg-orange-light p-3 text-ink">
                            <Icon size={20} aria-hidden="true" />
                        </span>

                        <div className="flex-1">
                            <h2 className="font-semibold text-ink">{title}</h2>
                            <p className="mt-1 text-sm text-muted">{description}</p>
                        </div>

                        <ArrowRight
                            size={18}
                            aria-hidden="true"
                            className="mt-1 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-ink"
                        />
                    </Link>
                ))}
            </nav>

          <section
        aria-labelledby="attention-heading" className="rounded-xl border border-slate-100 bg-white p-5">           
            <h2 id="attention-heading" className="font-semibold text-ink">
                Needs your attention
            </h2>

        {visibleItems.length === 0 ? (
            <p className="mt-2 text-sm text-muted">You’re all caught up.</p>
        ) : (
            <ul className="mt-3 divide-y divide-slate-100">
                {visibleItems.map(({ label, count, loading, error, to }) => (
                    <li key={to} className="py-2 text-sm">
                        {loading || error ? (
                            <p className="text-muted">
                                {label} — {loading ? "Loading…" : "Couldn’t load"}
                            </p>
                        ) : (
                            <Link to={to}                                
                                className="flex items-center justify-between gap-3 rounded-md py-1 text-ink hover:underline">                            
                                <span>{label}</span>
                                <span className="rounded-full bg-orange-light px-2.5 py-1 font-semibold">
                                    {count}
                                </span>
                            </Link>
                        )}
                    </li>
                ))}
            </ul>
        )}
    </section>  
        </div>
    );
}