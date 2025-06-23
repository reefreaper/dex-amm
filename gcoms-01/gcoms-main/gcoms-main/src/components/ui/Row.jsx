export default function Row({ children, className = "" }) {
    return (
        <div className={`flex flex-row flex-wrap w-full ${className}`}>
            {children}
        </div>
    );
}
