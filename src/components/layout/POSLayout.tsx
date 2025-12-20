import { Outlet } from "react-router-dom";

export function POSLayout() {
    return (
        <div className="h-screen w-screen bg-background overflow-hidden flex flex-col">
            {/* No Sidebar, No Header - Pure Focus */}
            <main className="flex-1 relative overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
}
