import { useNavigate } from "react-router-dom";
import { Anchor } from 'lucide-react';

export default function Home() {
    const navigate = useNavigate()

    return (
        <>
        <h1>Home Page</h1>
        <button className="cursor-pointer" onClick={() => navigate('about')}>About</button>
        <button className="cursor-pointer" onClick={() => navigate('contact')}>Contact</button>
        </>

    )
}