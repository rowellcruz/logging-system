import { HiOutlineMenu } from "react-icons/hi";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 shadow-lg flex items-center px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-2xl"
        aria-label="Open menu"
      >
        <HiOutlineMenu />
      </button>
    </header>
  );
}