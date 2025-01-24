
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Bars3Icon } from '@heroicons/react/24/outline';

export default function Navbar() {
  return (
    <nav className="bg-red-800 w-full">
      <div className="flex justify-between items-center h-24 px-4">
        
        <div className="flex space-x-4">
          <a href="#" className="text-gray-300 hover:text-white px-3 py-2 text-2xl font-medium">
            My Profile
          </a>
          <a href="#" className="text-gray-300 hover:text-white px-3 py-2 text-2xl font-medium">
            Find Others
          </a>
        </div>

        <div className="flex items-center">
          <Menu as="div" className="relative">
          <MenuButton className="flex items-center justify-center rounded-full bg-white p-2 text-black hover:bg-gray-400">
              <span className="sr-only">Open menu</span>
              {/* Hamburger Icon */}
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </MenuButton>
            <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
              <MenuItem>
                <a
                  href="/"
                  className="block px-4 py-2 text-xl text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </a>
              </MenuItem>
            </MenuItems>
          </Menu>
        </div>
      </div>
    </nav>
  );
}

