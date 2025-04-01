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
                <span 
                  className="font-medium px-2 py-0.5 rounded-full text-xs"
                  style={{ 
                    backgroundColor: getMemberColor(fromMember.id),
                    color: getContrastTextColor(getMemberColor(fromMember.id))
                  }}
                >
                  {fromMember.name}
                </span>
                <ArrowRight className="mx-2 text-gray-500 h-4 w-4" />
                <span 
                  className="font-medium px-2 py-0.5 rounded-full text-xs"
                  style={{ 
                    backgroundColor: getMemberColor(toMember.id),
                    color: getContrastTextColor(getMemberColor(toMember.id))
                  }}
                >
                  {toMember.name}
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
