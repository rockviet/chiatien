import { useSession } from '@/context/SessionContext';
import { useSessionData } from '@/hooks/useSessionData';
import { ArrowRight } from 'lucide-react';
import { getMemberColor, getContrastTextColor } from '@/utils/colors';

export function SettlementList() {
  const { members } = useSession();
  const { settlements, getMemberById } = useSessionData();

  if (settlements.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Không có khoản thanh toán nào cần thực hiện.
      </div>
    );
  }

  return (
    <div className="p-4">
      <ul className="divide-y divide-gray-200">
        {settlements.map((settlement, index) => {
          const fromMember = getMemberById(settlement.fromId);
          const toMember = getMemberById(settlement.toId);
          
          if (!fromMember || !toMember) return null;
          
          return (
            <li key={index} className="py-3 flex items-center justify-between">
              <div className="flex items-center">
                <span className="flex items-center text-xs font-medium">
                  <span 
                    className="inline-block w-3 h-3 rounded-full mr-1.5"
                    style={{ backgroundColor: getMemberColor(fromMember.id) }}
                  ></span>
                  {fromMember.name} {fromMember.slots > 1 ? `(${fromMember.slots})` : ''}
                </span>
                <ArrowRight className="mx-2 text-gray-500 h-4 w-4" />
                <span className="flex items-center text-xs font-medium">
                  <span 
                    className="inline-block w-3 h-3 rounded-full mr-1.5"
                    style={{ backgroundColor: getMemberColor(toMember.id) }}
                  ></span>
                  {toMember.name} {toMember.slots > 1 ? `(${toMember.slots})` : ''}
                </span>
              </div>
              <span className="text-right font-medium">{settlement.amount} nghìn VNĐ</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
