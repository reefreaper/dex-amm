import { useState } from 'react';

const AssetMetadataForm = ({ onMetadataSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState({
    basic: {
      title: "",
      description: "",
      assetType: "Real Estate",
      assetId: ""
    },
    ownership: {
      ownerName: "",
      acquisitionDate: "",
      previousOwner: "",
      ownershipPercentage: 100
    },
    value: {
      estimatedValue: "",
      currency: "USD",
      valuationDate: new Date().toISOString().split('T')[0],
      valuationMethod: "Market Value"
    },
    visual: {
      primaryColor: "#3B82F6", // Default blue
      secondaryColor: "#1E3A8A",
      layoutStyle: "Classic"
    }
  });

  const [activeTab, setActiveTab] = useState('basic');

  const handleChange = (section, field, value) => {
    setFormData({
      ...formData,
      [section]: {
        ...formData[section],
        [field]: value
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onMetadataSubmit(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <h3 className="text-lg font-medium mb-4">Asset Metadata</h3>
      
      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          type="button"
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'basic' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('basic')}
        >
          Basic Info
        </button>
        <button
          type="button"
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'ownership' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('ownership')}
        >
          Ownership
        </button>
        <button
          type="button"
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'value' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('value')}
        >
          Value
        </button>
        <button
          type="button"
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'visual' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('visual')}
        >
          Appearance
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Asset Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.basic.title}
                onChange={(e) => handleChange('basic', 'title', e.target.value)}
                className="shadow-sm border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                value={formData.basic.description}
                onChange={(e) => handleChange('basic', 'description', e.target.value)}
                className="shadow-sm border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows="3"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Asset Type
              </label>
              <select
                value={formData.basic.assetType}
                onChange={(e) => handleChange('basic', 'assetType', e.target.value)}
                className="shadow-sm border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Real Estate">Real Estate</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Artwork">Artwork</option>
                <option value="Document">Document</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Asset ID/Serial Number
              </label>
              <input
                type="text"
                value={formData.basic.assetId}
                onChange={(e) => handleChange('basic', 'assetId', e.target.value)}
                className="shadow-sm border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
        
        {/* Ownership Tab */}
        {activeTab === 'ownership' && (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Owner Name
              </label>
              <input
                type="text"
                value={formData.ownership.ownerName}
                onChange={(e) => handleChange('ownership', 'ownerName', e.target.value)}
                className="shadow-sm border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Date of Acquisition
              </label>
              <input
                type="date"
                value={formData.ownership.acquisitionDate}
                onChange={(e) => handleChange('ownership', 'acquisitionDate', e.target.value)}
                className="shadow-sm border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Previous Owner
              </label>
              <input
                type="text"
                value={formData.ownership.previousOwner}
                onChange={(e) => handleChange('ownership', 'previousOwner', e.target.value)}
                className="shadow-sm border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Ownership Percentage
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.ownership.ownershipPercentage}
                onChange={(e) => handleChange('ownership', 'ownershipPercentage', parseInt(e.target.value) || 0)}
                className="shadow-sm border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
        
        {/* Value Tab */}
        {activeTab === 'value' && (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Estimated Value
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.value.estimatedValue}
                onChange={(e) => handleChange('value', 'estimatedValue', e.target.value)}
                className="shadow-sm border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Currency
              </label>
              <select
                value={formData.value.currency}
                onChange={(e) => handleChange('value', 'currency', e.target.value)}
                className="shadow-sm border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="ETH">ETH</option>
                <option value="BTC">BTC</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Valuation Date
              </label>
              <input
                type="date"
                value={formData.value.valuationDate}
                onChange={(e) => handleChange('value', 'valuationDate', e.target.value)}
                className="shadow-sm border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Valuation Method
              </label>
              <select
                value={formData.value.valuationMethod}
                onChange={(e) => handleChange('value', 'valuationMethod', e.target.value)}
                className="shadow-sm border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Appraisal">Appraisal</option>
                <option value="Market Value">Market Value</option>
                <option value="Purchase Price">Purchase Price</option>
                <option value="Insurance Value">Insurance Value</option>
              </select>
            </div>
          </div>
        )}
        
        {/* Visual Tab */}
        {activeTab === 'visual' && (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Primary Color
              </label>
              <div className="flex items-center">
                <input
                  type="color"
                  value={formData.visual.primaryColor}
                  onChange={(e) => handleChange('visual', 'primaryColor', e.target.value)}
                  className="h-10 w-10 border rounded mr-2"
                />
                <span className="text-sm text-gray-500">{formData.visual.primaryColor}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Secondary Color
              </label>
              <div className="flex items-center">
                <input
                  type="color"
                  value={formData.visual.secondaryColor}
                  onChange={(e) => handleChange('visual', 'secondaryColor', e.target.value)}
                  className="h-10 w-10 border rounded mr-2"
                />
                <span className="text-sm text-gray-500">{formData.visual.secondaryColor}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Layout Style
              </label>
              <select
                value={formData.visual.layoutStyle}
                onChange={(e) => handleChange('visual', 'layoutStyle', e.target.value)}
                className="shadow-sm border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Classic">Classic</option>
                <option value="Modern">Modern</option>
                <option value="Minimal">Minimal</option>
                <option value="Certificate">Certificate</option>
              </select>
            </div>
          </div>
        )}
        
        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={() => {
              const tabs = ['basic', 'ownership', 'value', 'visual'];
              const currentIndex = tabs.indexOf(activeTab);
              const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
              setActiveTab(tabs[prevIndex]);
            }}
            className={`px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none ${activeTab === 'basic' ? 'invisible' : ''}`}
          >
            Previous
          </button>
          
          {activeTab !== 'visual' ? (
            <button
              type="button"
              onClick={() => {
                const tabs = ['basic', 'ownership', 'value', 'visual'];
                const currentIndex = tabs.indexOf(activeTab);
                const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : currentIndex;
                setActiveTab(tabs[nextIndex]);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || !formData.basic.title}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing...' : 'Generate Asset'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AssetMetadataForm;