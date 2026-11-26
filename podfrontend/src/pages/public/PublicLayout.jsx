import { Link, NavLink, Outlet } from "react-router-dom";
import { Wallet } from "lucide-react";

export default function PublicLayout() {
    return (
        <div className="min-h-screen bg-white text-ink">
            
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
                    <NavLink to="/" end className="hover:text-orange transition">Home</NavLink>
                    <NavLink to="/about" className="hover:text-orange transition">About</NavLink>
                    <NavLink to="/features" className="hover:text-orange transition">Features</NavLink>
                    <NavLink to="/contact" className="hover:text-orange transition">Contact</NavLink>

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
            <main>
                <Outlet />
            </main>
            {/* Paste the existing footer here. */}


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

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted">
                    <NavLink to="/" end className="hover:text-orange transition">Home</NavLink>
                    <NavLink to="/about" className="hover:text-orange transition">About</NavLink>
                    <NavLink to="/features" className="hover:text-orange transition">Features</NavLink>
                    <NavLink to="/contact" className="hover:text-orange transition">Contact</NavLink>
                    
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