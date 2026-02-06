import { Thread } from "./components/thread";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MyRuntimeProvider } from "./MyRuntimeProvider";

export default function App() {
  return (
    <MyRuntimeProvider>
      <TooltipProvider>
        <div className="h-screen">
          <Thread />
        </div>
      </TooltipProvider>
    </MyRuntimeProvider>
  );
}
