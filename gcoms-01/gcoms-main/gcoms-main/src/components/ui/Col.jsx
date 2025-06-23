export default function Col({ children, className = "" }) {
    return (
        <div className={`flex flex-col w-full ${className}`}>
            {children}
        </div>
    );
}
