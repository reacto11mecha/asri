import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export function ForceDeleteDialog({
  title,
  itemName,
  onConfirm,
  children,
}: {
  title: string;
  itemName: string;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  // 1. Tambahkan state isOpen untuk mengontrol dialog secara manual
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const expectedText =
    `SAYA PAHAM DAN MENGERTI KONSEKUENSINYA, HAPUS ${itemName}`.toUpperCase();
  const isMatch = inputValue === expectedText;

  return (
    <AlertDialog
      open={isOpen} // 2. Bind state isOpen ke komponen
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setInputValue("");
      }}
    >
      {children}

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini tidak dapat dibatalkan. Semua data terkait (termasuk
            riwayat absensi) akan ikut terhapus secara permanen.
            <br />
            <br />
            Ketik{" "}
            <strong className="bg-muted text-foreground pointer-events-none rounded px-1.5 py-0.5 select-none">
              {expectedText}
            </strong>{" "}
            untuk melanjutkan:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPaste={(e) => e.preventDefault()}
          placeholder={expectedText}
          className="mt-2"
        />
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setInputValue("")}>
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            render={<Button variant="destructive" disabled={!isMatch} />}
            onClick={(e) => {
              if (!isMatch) {
                e.preventDefault();
                return;
              }
              onConfirm();
              setIsOpen(false); // 3. Paksa tutup dialog secara manual
              setInputValue("");
            }}
          >
            Hapus Permanen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
