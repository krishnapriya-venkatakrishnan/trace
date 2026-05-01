import { QueryProvider } from './QueryContext';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { ReasoningPanel } from './components/ReasoningPanel';

export const dynamic = 'force-dynamic';

export default function AskPage() {
    return (
        <div className="flex h-screen overflow-hidden bg-paper">
            <Sidebar />
            <QueryProvider>
                <ChatPanel />
                <ReasoningPanel />
            </QueryProvider>
        </div>
    );
}
