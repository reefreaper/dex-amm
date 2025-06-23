
import logo from '../docs_img.jpeg';
import { Link, useLocation } from 'react-router-dom';

const Navigation = ({ account }) => {
  const location = useLocation();
  return (
    <div className='flex flex-row items-center p-2 border-b border-gray-200'>
      <img
        alt="logo"
        src={logo}
        width="40"
        height="40"
        className="inline-block mr-3"
      />
      <div className="text-gray-600 font-medium">Asset Docs</div>
      <div className="ml-auto">
        <div className="text-gray-500 text-sm truncate max-w-xs">
          {account}
        </div>
      </div>
    </div>
  );
}

export default Navigation;
