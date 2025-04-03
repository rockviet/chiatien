import { useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, UserPlus } from 'lucide-react';
import { getMemberColor } from '@/utils/colors';
import { AddMemberModal } from './AddMemberModal';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function MembersList() {
  const { members, deleteMember, updateMember } = useSession();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ id: number, name: string } | null>(null);

  const handleEditClick = (id: number, name: string) => {
    setSelectedMember({ id, name });
    setShowEditModal(true);
  };

  const handleDeleteClick = (id: number, name: string) => {
    setSelectedMember({ id, name });
    setShowDeleteDialog(true);
  };

  const handleEditSubmit = (name: string) => {
    if (selectedMember) {
      updateMember(selectedMember.id, name);
      setShowEditModal(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedMember) {
      deleteMember(selectedMember.id);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Thành viên</h2>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-white hover:bg-blue-600 flex items-center"
          size="sm"
        >
          <UserPlus className="mr-1 h-4 w-4" /> Thêm
        </Button>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {members.length === 0 ? (
              <div className="text-sm text-gray-500 py-2">
                Chưa có thành viên nào. Thêm thành viên để bắt đầu.
              </div>
            ) : (
              members.map(member => (
                <div key={member.id} className="flex items-center px-3 py-1.5 rounded-md bg-gray-50">
                  <span className="flex items-center font-medium mr-2">
                    <span 
                      className="inline-block w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: getMemberColor(member.id) }}
                    ></span>
                    {member.name}
                  </span>
                  <button 
                    onClick={() => handleEditClick(member.id, member.name)}
                    className="text-gray-500 hover:text-primary"
                    aria-label="Sửa thành viên"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(member.id, member.name)}
                    className="text-gray-500 hover:text-danger ml-1"
                    aria-label="Xóa thành viên"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      <AddMemberModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        mode="add"
      />

      {/* Edit Member Modal */}
      <AddMemberModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        mode="edit"
        initialName={selectedMember?.name || ''}
        onSubmit={handleEditSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa thành viên {selectedMember?.name}? 
              Các chi tiêu của thành viên này cũng sẽ bị xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-500 hover:bg-red-600">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
