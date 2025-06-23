import { useNavigate } from "react-router-dom";

export default function Contact() {
    const navigate = useNavigate()

    return (
        <>
        <h1>Contact Page</h1>
        <button className="cursor-pointer" onClick={() => navigate('/')}>Home</button>
        </>

    )
}