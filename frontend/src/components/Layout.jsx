import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Layout({ title, children }) {
    return (
        <div className="flex min-h-screen bg-white">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0" style={{ background: "var(--page)" }}>
                <TopBar title={title} />
                <main className="flex-1 p-8">{children}</main>
            </div>
        </div>
    );
}
