import DashNav from "./DashNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dash">
      <DashNav />
      <div className="dash-main">{children}</div>
    </div>
  );
}
