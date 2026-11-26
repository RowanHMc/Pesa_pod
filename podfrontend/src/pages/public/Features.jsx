import {
    Users,
    Wallet,
    CalendarDays,
    HandCoins,
    Bell,
    ShieldCheck,
} from "lucide-react";

export default function Features(){
     const features = [
        {
            icon: Users,
            title: "Chama Management",
            description:
                "Create and manage your chama groups, organize members, and keep group information in one place.",
        },
        {
            icon: Wallet,
            title: "Contribution Tracking",
            description:
                "Keep track of member contributions, payment reports, and treasurer confirmations.",
        },
        {
            icon: CalendarDays,
            title: "Savings Cycles",
            description:
                "Organize your group's savings cycles and keep track of contribution rounds and due dates.",
        },
        {
            icon: HandCoins,
            title: "Payout Tracking",
            description:
                "Keep members informed about payout schedules and monitor the progress of each round.",
        },
        {
            icon: Bell,
            title: "Notifications",
            description:
                "Stay informed about important group activities, contribution deadlines, and payment updates.",
        },
        {
            icon: ShieldCheck,
            title: "Transparency",
            description:
                "Give members a clearer view of group contributions, payment confirmations, and payout records.",
        },
    ];
    return(

                <section id="features" className="bg-powder-light py-20 md:py-24">
                <div className="max-w-7xl mx-auto px-6">

                    <div className="text-center max-w-2xl mx-auto mb-14">
                        <span className="text-orange font-bold uppercase tracking-wider text-sm">
                            What Pesa Pod offers
                        </span>

                        <h2 className="text-3xl sm:text-4xl font-bold mt-4">
                            Everything your chama needs to stay organized
                        </h2>

                        <p className="text-muted mt-5 leading-relaxed">
                            Useful tools designed to make group savings
                            management clearer and more convenient.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;

                            return (
                                <div
                                    key={index}
                                    className="bg-white rounded-2xl p-7 border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition duration-300"
                                >
                                    <div className="bg-orange-light w-14 h-14 rounded-xl flex items-center justify-center mb-5">
                                        <Icon size={27} className="text-orange" />
                                    </div>

                                    <h3 className="text-xl font-bold mb-3">
                                        {feature.title}
                                    </h3>

                                    <p className="text-muted leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </section>
)
};