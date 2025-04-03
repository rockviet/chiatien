import { useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { useSessionData } from '@/hooks/useSessionData';
import { ArrowRight, Users, PlusCircle, X, Edit } from 'lucide-react';
import { getMemberColor, getContrastTextColor } from '@/utils/colors';
import { nanoid } from 'nanoid';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MemberGroup } from '@/utils/calculations';
import { formatVietnameseCurrency } from '@/utils/format';

export function SettlementList() {
  const { members } = useSession();
  const { 
    settlements, 
    getMemberById, 
    isGroupingEnabled, 
    toggleGrouping, 
    memberGroups, 
    addMemberGroup, 
    updateMemberGroup, 
    removeMemberGroup, 
    getMemberGroup
  } = useSessionData();

  // State cho dialog tạo/chỉnh sửa nhóm
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<MemberGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  // Mở dialog tạo nhóm mới
  const openCreateGroupDialog = () => {
    setCurrentGroup(null);
    setGroupName('');
    setSelectedMembers([]);
    setIsGroupDialogOpen(true);
  };

  // Mở dialog chỉnh sửa nhóm
  const openEditGroupDialog = (group: MemberGroup) => {
    setCurrentGroup(group);
    setGroupName(group.name);
    setSelectedMembers([...group.memberIds]);
    setIsGroupDialogOpen(true);
  };

  // Lưu nhóm
  const saveGroup = () => {
    if (groupName.trim() === '' || selectedMembers.length < 2) return;

    if (currentGroup) {
      // Cập nhật nhóm hiện có
      updateMemberGroup(currentGroup.id, {
        name: groupName,
        memberIds: selectedMembers
      });
    } else {
      // Tạo nhóm mới
      const newGroup: MemberGroup = {
        id: `group-${nanoid(8)}`,
        name: groupName,
        memberIds: selectedMembers
      };
      addMemberGroup(newGroup);
    }

    setIsGroupDialogOpen(false);
  };

  // Xóa nhóm
  const deleteGroup = (groupId: string) => {
    removeMemberGroup(groupId);
  };

  // Render danh sách khoản thanh toán
  if (settlements.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Không có khoản giao dịch nào cần thực hiện.
      </div>
    );
  }

  // Lấy tên của nhóm
  const getGroupName = (groupId?: string) => {
    if (!groupId) return null;
    const group = memberGroups.find(g => g.id === groupId);
    return group ? group.name : null;
  };

  return (
    <div className="p-2 sm:p-4">
      {/* Phần cài đặt nhóm thành viên */}
      <div className="mb-4 bg-white p-3 sm:p-4 rounded-md shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2">
            <Switch 
              id="grouping-toggle" 
              checked={isGroupingEnabled}
              onCheckedChange={toggleGrouping}
            />
            <Label htmlFor="grouping-toggle" className="cursor-pointer text-sm sm:text-base">
              <span className="flex items-center">
                <Users className="h-4 w-4 mr-1.5" />
                Nhóm thành viên
              </span>
            </Label>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs w-full sm:w-auto"
            onClick={openCreateGroupDialog}
            disabled={!isGroupingEnabled}
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            Tạo nhóm
          </Button>
        </div>
        
        {isGroupingEnabled && memberGroups.length > 0 && (
          <div className="mt-2">
            <div className="text-xs font-medium mb-1.5">Nhóm đã tạo:</div>
            <ul className="space-y-1">
              {memberGroups.map(group => (
                <li 
                  key={group.id} 
                  className="flex items-center justify-between bg-gray-50 rounded p-2 text-xs"
                >
                  <span className="font-medium">{group.name}</span>
                  <span className="text-gray-500 mx-2">
                    {group.memberIds.length} thành viên
                  </span>
                  <div className="flex space-x-1">
                    <button 
                      className="p-1 text-blue-500 hover:text-blue-700" 
                      onClick={() => openEditGroupDialog(group)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      className="p-1 text-red-500 hover:text-red-700" 
                      onClick={() => deleteGroup(group.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Danh sách các khoản thanh toán */}
      <div className="bg-white p-3 sm:p-4 rounded-md shadow-sm">
        <h3 className="text-sm sm:text-base font-medium mb-3">Các giao dịch chéo giữa các thành viên</h3>
        <ul className="divide-y divide-gray-200">
          {settlements.map((settlement, index) => {
            const fromMember = getMemberById(settlement.fromId);
            const toMember = getMemberById(settlement.toId);
            
            if (!fromMember || !toMember) return null;
            
            // Kiểm tra xem có phải là giao dịch giữa các nhóm không
            const fromGroupName = getGroupName(settlement.fromGroupId);
            const toGroupName = getGroupName(settlement.toGroupId);
            
            return (
              <li key={index} className="py-2.5 sm:py-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <div className="flex items-center min-w-0">
                      <span 
                        className="inline-block w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getMemberColor(fromMember.id) }}
                      ></span>
                      <span className="ml-1.5 text-xs sm:text-sm font-medium truncate">
                        {fromGroupName ? (
                          <span className="flex items-center">
                            <span className="font-semibold truncate">{fromGroupName}</span>
                            <span className="ml-1 text-xs opacity-70 hidden sm:inline">({fromMember.name})</span>
                          </span>
                        ) : (
                          fromMember.name
                        )}
                      </span>
                    </div>

                    <ArrowRight className="text-gray-500 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />

                    <div className="flex items-center min-w-0">
                      <span 
                        className="inline-block w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getMemberColor(toMember.id) }}
                      ></span>
                      <span className="ml-1.5 text-xs sm:text-sm font-medium truncate">
                        {toGroupName ? (
                          <span className="flex items-center">
                            <span className="font-semibold truncate">{toGroupName}</span>
                            <span className="ml-1 text-xs opacity-70 hidden sm:inline">({toMember.name})</span>
                          </span>
                        ) : (
                          toMember.name
                        )}
                      </span>
                    </div>
                  </div>

                  <span className="text-right text-xs sm:text-sm font-medium text-primary">
                    {formatVietnameseCurrency(settlement.amount)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      
      {/* Dialog tạo/chỉnh sửa nhóm */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentGroup ? 'Chỉnh sửa nhóm' : 'Tạo nhóm thành viên'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="group-name">Tên nhóm</Label>
              <Input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="VD: Vợ chồng A, Gia đình B, Nhóm C..."
              />
            </div>
            
            <div className="space-y-1">
              <Label>Thành viên trong nhóm</Label>
              <div className="bg-gray-50 p-3 rounded-md space-y-2 max-h-40 overflow-y-auto">
                {members.map(member => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={selectedMembers.includes(member.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedMembers(prev => [...prev, member.id]);
                        } else {
                          setSelectedMembers(prev => prev.filter(id => id !== member.id));
                        }
                      }}
                    />
                    <Label htmlFor={`member-${member.id}`} className="text-sm cursor-pointer">
                      <span className="flex items-center">
                        <span 
                          className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
                          style={{ backgroundColor: getMemberColor(member.id) }}
                        ></span>
                        {member.name}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
              {selectedMembers.length < 2 && (
                <p className="text-xs text-amber-600 mt-1">Cần có ít nhất 2 thành viên trong nhóm</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={() => setIsGroupDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button 
                type="button" 
                className="w-full sm:w-auto bg-primary hover:bg-blue-600"
                onClick={saveGroup}
                disabled={groupName.trim() === '' || selectedMembers.length < 2}
              >
                {currentGroup ? 'Cập nhật' : 'Tạo nhóm'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
