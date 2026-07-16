import React, { createContext, useContext, useState, ReactNode } from "react";
import { Dialog, Drawer } from "@jaldee/design-system";

interface DrawerOptions {
  panelClassName?: string;
}

interface ModalContextType {
  isOpen: boolean;
  isDrawerOpen: boolean;
  modalContent: ReactNode | null;
  drawerContent: ReactNode | null;
  openModal: (content: ReactNode) => void;
  closeModal: () => void;
  openDrawer: (content: ReactNode, options?: DrawerOptions) => void;
  closeDrawer: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalContent, setModalContent] = useState<ReactNode | null>(null);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerContent, setDrawerContent] = useState<ReactNode | null>(null);
  const [drawerOptions, setDrawerOptions] = useState<DrawerOptions>({});

  const openModal = (content: ReactNode) => {
    setModalContent(content);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setTimeout(() => setModalContent(null), 300);
  };

  const openDrawer = (content: ReactNode, options?: DrawerOptions) => {
    setDrawerContent(content);
    if (options) setDrawerOptions(options);
    else setDrawerOptions({});
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setDrawerContent(null), 300);
  };

  return (
    <ModalContext.Provider value={{ isOpen, isDrawerOpen, modalContent, drawerContent, openModal, closeModal, openDrawer, closeDrawer }}>
      {children}
      <Dialog
        open={isOpen}
        onClose={closeModal}
        testId="bookings-global-modal"
        size="lg"
        hideHeader
        showCloseButton={false}
        contentClassName="max-h-[92vh] overflow-y-auto p-0"
      >
        {modalContent}
      </Dialog>
      <Drawer
        open={isDrawerOpen}
        onClose={closeDrawer}
        size="md"
        hideHeader
        showCloseButton={false}
        panelClassName={drawerOptions?.panelClassName || "bg-[#f8fafc] sm:w-[500px]"}
        contentClassName="p-0 flex flex-col h-full"
      >
        {drawerContent}
      </Drawer>
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within ModalProvider");
  return context;
};
