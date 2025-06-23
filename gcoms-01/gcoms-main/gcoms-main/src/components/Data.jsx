import { ethers } from 'ethers'

const Data = ({ maxSupply, totalSupply, cost, balance, isWhitelisted, whitelistOnly }) => {
  return(
    <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
      <div className="grid grid-cols-1 gap-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Available to Mint:</span>
          <span className="text-gray-600 font-medium">{maxSupply - totalSupply}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-500">Cost to Mint:</span>
          <span className="text-gray-600 font-medium">{ethers.utils.formatEther(cost)} ETH</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-500">You own:</span>
          <span className="text-gray-600 font-medium">{balance.toString()}</span>
        </div>
        
        {whitelistOnly && (
          <div className="flex justify-between">
            <span className="text-gray-500">Whitelist Status:</span>
            <span className={isWhitelisted ? "text-green-500 font-medium" : "text-red-400 font-medium"}>
              {isWhitelisted ? '✅ Whitelisted' : '❌ Not Whitelisted'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default Data;
