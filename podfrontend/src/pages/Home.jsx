
import { Link } from "react-router-dom";
import {
    Wallet,
    Users,
    CalendarDays,
    ChartNoAxesCombined,
    Bell,
    ShieldCheck,
    ArrowRight,
    Menu,
    HandCoins,
    CheckCircle2,
} from "lucide-react";

function Home() {
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

    return (
        <div className="min-h-screen bg-white text-ink">

            {/* Navigation */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100">
                <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

                    <Link to="/" className="flex items-center gap-2">
                        <div className="bg-powder p-2 rounded-xl">
                            <Wallet size={25} className="text-ink" />
                        </div>

                        <span className="text-2xl font-bold">
                            Pesa <span className="text-orange">Pod</span>
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted">
                        <a href="#home" className="hover:text-orange transition">
                            Home
                        </a>
                        <a href="#about" className="hover:text-orange transition">
                            About
                        </a>
                        <a href="#features" className="hover:text-orange transition">
                            Features
                        </a>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            to="/login"
                            className="hidden sm:inline-block font-semibold text-ink hover:text-orange transition"
                        >
                            Login
                        </Link>

                        <Link
                            to="/register"
                            className="bg-orange hover:bg-orange/90 text-white px-5 py-2.5 rounded-lg font-semibold transition"
                        >
                            Get Started
                        </Link>
                    </div>

                </nav>
            </header>

            {/* Hero */}
            <section
                id="home"
                className="bg-powder-light overflow-hidden"
            >
                <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-14 items-center">

                    <div>
                        <span className="inline-block bg-white text-orange font-semibold text-sm px-4 py-2 rounded-full mb-6">
                            A smarter way to manage your chama
                        </span>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-ink">
                            Save together.
                            <span className="text-orange block">
                                Grow together.
                            </span>
                        </h1>

                        <p className="text-muted text-lg leading-relaxed mt-6 max-w-xl">
                            Pesa Pod makes chama management simpler.
                            Organize your group, track contributions,
                            manage savings cycles, and keep everyone
                            informed in one convenient platform.
                        </p>

                        <div className="flex flex-wrap gap-4 mt-9">
                            <Link
                                to="/register"
                                className="inline-flex items-center gap-2 bg-orange hover:bg-orange/90 text-white font-semibold px-7 py-3.5 rounded-lg transition"
                            >
                                Create an Account
                                <ArrowRight size={19} />
                            </Link>

                            <Link
                                to="/login"
                                className="border border-ink/20 hover:border-orange text-ink font-semibold px-7 py-3.5 rounded-lg transition"
                            >
                                Sign In
                            </Link>
                        </div>

                        <div className="flex flex-wrap gap-5 mt-9 text-sm text-muted">
                            <span className="flex items-center gap-2">
                                <CheckCircle2 size={17} className="text-orange" />
                                Organized group savings
                            </span>

                            <span className="flex items-center gap-2">
                                <CheckCircle2 size={17} className="text-orange" />
                                Clear contribution records
                            </span>
                        </div>
                    </div>

                    {/* Decorative dashboard illustration */}
                    <div className="relative">
                        <div className="absolute -top-10 -right-10 w-48 h-48 bg-powder rounded-full opacity-60 blur-2xl" />
                        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-orange-light rounded-full opacity-80 blur-2xl" />

                        <div className="relative bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8">

                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <p className="text-sm text-muted">
                                        Your savings community
                                    </p>
                                    <h3 className="text-xl font-bold mt-1">
                                        Chama Overview
                                    </h3>
                                </div>

                                <div className="bg-powder-light p-3 rounded-xl">
                                    <Users size={25} className="text-ink" />
                                </div>
                            </div>

                            <div className="bg-powder-light rounded-2xl p-5 mb-5">
                                <p className="text-sm text-muted">
                                    Contribution tracking
                                </p>

                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-2xl font-bold">
                                        Stay organized
                                    </span>
                                    <ChartNoAxesCombined
                                        size={30}
                                        className="text-orange"
                                    />
                                </div>

                                <div className="w-full bg-white rounded-full h-2 mt-5">
                                    <div className="bg-orange w-2/3 h-2 rounded-full" />
                                </div>

                                <p className="text-xs text-muted mt-2">
                                    Keep track of group contributions
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="border border-slate-100 rounded-xl p-4">
                                    <div className="bg-orange-light w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                                        <Wallet size={21} className="text-orange" />
                                    </div>
                                    <p className="text-sm text-muted">
                                        Contributions
                                    </p>
                                    <p className="font-bold mt-1">
                                        Track payments
                                    </p>
                                </div>

                                <div className="border border-slate-100 rounded-xl p-4">
                                    <div className="bg-powder-light w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                                        <CalendarDays size={21} className="text-ink" />
                                    </div>
                                    <p className="text-sm text-muted">
                                        Savings cycles
                                    </p>
                                    <p className="font-bold mt-1">
                                        Track rounds
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-5 bg-orange-light rounded-xl p-4">
                                <Bell size={22} className="text-orange" />
                                <p className="text-sm text-ink">
                                    Stay updated on important group activities.
                                </p>
                            </div>

                        </div>
                    </div>

                </div>
            </section>

            {/* About */}
            <section id="about" className="py-20 md:py-24">
                <div className="max-w-4xl mx-auto px-6 text-center">

                    <span className="text-orange font-bold uppercase tracking-wider text-sm">
                        About Pesa Pod
                    </span>

                    <h2 className="text-3xl sm:text-4xl font-bold mt-4">
                        Bringing your chama activities together
                    </h2>

                    <p className="text-muted text-lg leading-relaxed mt-6">
                        Chamas are built on trust, consistency, and working
                        together towards shared financial goals. Managing
                        contributions, keeping records, and coordinating
                        members can become challenging as groups grow.
                    </p>

                    <p className="text-muted text-lg leading-relaxed mt-4">
                        Pesa Pod provides a central platform where chama
                        members and officials can organize group activities,
                        track savings contributions, monitor payout schedules,
                        and maintain clearer records of their savings journey.
                    </p>

                </div>
            </section>

            {/* Features */}
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

            {/* Call to Action */}
            <section className="py-20 md:py-24">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="bg-ink rounded-3xl px-7 py-14 sm:p-16 text-center">

                        <h2 className="text-3xl sm:text-4xl font-bold text-white">
                            Ready to organize your chama?
                        </h2>

                        <p className="text-slate-300 mt-5 max-w-2xl mx-auto leading-relaxed">
                            Join Pesa Pod and bring your group's savings
                            activities into one organized space.
                        </p>

                        <Link
                            to="/register"
                            className="inline-flex items-center gap-2 bg-orange hover:bg-orange/90 text-white font-semibold px-8 py-3.5 rounded-lg mt-8 transition"
                        >
                            Get Started Today
                            <ArrowRight size={19} />
                        </Link>

                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-powder-light border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-6 py-10">

                    <div className="flex flex-col md:flex-row justify-between gap-8">

                        <div className="max-w-sm">
                            <Link to="/" className="text-2xl font-bold">
                                Pesa <span className="text-orange">Pod</span>
                            </Link>

                            <p className="text-muted mt-4 leading-relaxed">
                                Making chama management simpler,
                                clearer, and more organized.
                            </p>
                        </div>

                        <div>

                            <div className="flex flex-col gap-3 text-sm text-muted">
                                <a href="#home" className="hover:text-orange transition">
                                    Home
                                </a>
                                <a href="#about" className="hover:text-orange transition">
                                    About
                                </a>
                                <a href="#features" className="hover:text-orange transition">
                                    Features
                                </a>
                                <Link to="/login" className="hover:text-orange transition">
                                    Login
                                </Link>
                                <Link to="/register" className="hover:text-orange transition">
                                    Register
                                </Link>
                            </div>
                        </div>

                    </div>

                    <div className="border-t border-slate-200 mt-10 pt-6 text-center text-sm text-muted">
                        © {new Date().getFullYear()} Pesa Pod. All rights reserved.
                    </div>

                </div>
            </footer>

        </div>
    );
}

export default Home;
