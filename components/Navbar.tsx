import React, { useState, useEffect, useRef } from 'react';
import { Plus, LogOut, LayoutDashboard, Shield, Settings } from 'lucide-react';
import { User } from '../types';
import { Button } from './Button';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onUploadClick: () => void;
  onDashboardClick: () => void;
  onAdminClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  onLogout, 
  onUploadClick, 
  onDashboardClick,
  onAdminClick
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo Area */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={onDashboardClick}>
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            V
          </div>
          <span className="text-xl font-bold text-gray-900 hidden sm:block">Votely</span>
        </div>

        {/* Actions Area */}
        <div className="flex items-center gap-4">
          {/* Admin Link */}
          {user.isAdmin && (
            <Button variant="ghost" onClick={onAdminClick} className="hidden sm:flex items-center gap-2">
              <Shield size={18} />
              <span className="hidden md:inline">Admin</span>
            </Button>
          )}

          {/* Feed Link */}
          <Button variant="ghost" onClick={onDashboardClick} className="hidden sm:flex items-center gap-2">
            <LayoutDashboard size={18} />
            <span className="hidden md:inline">Feed</span>
          </Button>

          {/* Create Button */}
          <Button variant="secondary" onClick={onUploadClick} className="flex items-center gap-2">
            <Plus size={18} />
            <span className="hidden md:inline">Create</span>
          </Button>

          {/* User Avatar Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 focus:outline-none group"
            >
              <div className="h-9 w-9 rounded-full bg-gray-200 overflow-hidden border border-gray-300 ring-2 ring-transparent group-hover:ring-red-100 transition-all">
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              </div>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-200 transform origin-top-right z-50">
                
                {/* User Header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  {user.isAdmin && (
                     <button 
                        onClick={() => {
                            onAdminClick();
                            setIsDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 sm:hidden"
                      >
                        <Shield size={16} />
                        Admin Dashboard
                      </button>
                  )}
                  
                  <button 
                    onClick={() => {
                      alert("Settings feature coming soon!");
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                </div>

                <div className="border-t border-gray-100 py-1">
                  <button 
                    onClick={onLogout}
                    className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};