import { Link,NavLink } from "react-router-dom"

export default function About(){
    return(

    
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
)
};