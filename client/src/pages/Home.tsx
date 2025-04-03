import { useState, useEffect } from 'react';
import { useSession } from '@/context/SessionContext';
import { SessionCode } from '@/components/SessionCode';
import { MembersList } from '@/components/MembersList';
import { ExpensesTable } from '@/components/ExpensesTable';
import { SettlementList } from '@/components/SettlementList';
import { ExpenseChart } from '@/components/ExpenseChart';
import { StatsSummary } from '@/components/StatsSummary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { sessionCode, isLoading, error, createSession } = useSession();
  const [activeTab, setActiveTab] = useState<string>("expenses");

  // If no session code, create a new session
  useEffect(() => {
    if (!isLoading && !sessionCode && !error) {
      createSession();
    }
  }, [isLoading, sessionCode, error, createSession]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <h2 className="mt-4 font-medium font-mono">Đang lấy dữ liệu và tạo socket...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-100">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-red-500">Lỗi kết nối</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Tải lại trang
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-800">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-primary">Bi Lắc 5.0</h1>
          </div>
          <div className="flex items-center">
            <SessionCode />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow px-4 py-6">
        <div className="w-full">
          {/* Tabs */}
          <Tabs defaultValue="expenses" value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="border-b border-gray-200 w-full justify-center rounded-none bg-transparent h-auto">
              <TabsTrigger 
                value="expenses" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-4 px-1 mr-8"
                data-state={activeTab === "expenses" ? "active" : "inactive"}
              >
                Chi tiêu
              </TabsTrigger>
              <TabsTrigger 
                value="summary" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-4 px-1 mr-8"
                data-state={activeTab === "summary" ? "active" : "inactive"}
              >
                Tổng kết
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="expenses" className="mt-6">
              {/* Members Section */}
              <section className="mb-8">
                <MembersList />
              </section>

              {/* Expenses Table Section */}
              <section>
                <ExpensesTable />
              </section>
            </TabsContent>
            
            <TabsContent value="summary" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Settlement Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Tạo giao dịch chéo</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <SettlementList />
                  </CardContent>
                </Card>

                {/* Chart Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Biểu đồ chi tiêu</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ExpenseChart />
                  </CardContent>
                </Card>
              
                {/* Total Stats Section */}
                <Card className="md:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle>Thống kê chi tiêu</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <StatsSummary />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-gray-500 mt-8">
        Made with ❤️ by @viet241
      </footer>
    </div>
  );
}
