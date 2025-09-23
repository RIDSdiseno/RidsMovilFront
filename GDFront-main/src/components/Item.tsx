import { NavLink } from "react-router-dom";
import clsx from "clsx";

interface ItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
}

const Item: React.FC<ItemProps> = ({ to, icon, label, isOpen }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-zinc-800 text-white"
            : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
        )
      }
    >
      {icon}
      {isOpen && <span>{label}</span>}
    </NavLink>
  );
};

export default Item;
