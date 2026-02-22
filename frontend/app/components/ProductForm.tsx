import { useState } from 'react';
import { Upload, X, Image as ImageIcon, Save, XCircle } from 'lucide-react';

export function ProductForm() {
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [initialStock, setInitialStock] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newImages = Array.from(files).map(file => URL.createObjectURL(file));
    setImages(prev => [...prev, ...newImages]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Product saved');
  };

  const handleCancel = () => {
    // Handle cancel action
    console.log('Cancel clicked');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Details Section */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-gray-900 text-lg">Product Details</h2>
            <p className="text-gray-600 text-sm">Enter basic product information</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-gray-700 text-sm mb-2">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., Samsung Galaxy A54 5G"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-gray-700 text-sm mb-2">
                SKU (Stock Keeping Unit) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g., MOB-SAM-A54-001"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm"
              />
              <p className="text-gray-500 text-xs mt-1.5">Must be unique for each product</p>
            </div>

            <div>
              <label className="block text-gray-700 text-sm mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none bg-white"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="">Select a category</option>
                <option value="Electronics">Electronics</option>
                <option value="Mobile Phones">Mobile Phones</option>
                <option value="Computers & Laptops">Computers & Laptops</option>
                <option value="Audio & Sound">Audio & Sound</option>
                <option value="Accessories">Accessories</option>
                <option value="Home Appliances">Home Appliances</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm mb-2">
              Price (LKR) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                Rs
              </span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter product description, features, specifications..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* Product Images Section */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Upload className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-gray-900 text-lg">Product Images</h2>
            <p className="text-gray-600 text-sm">Upload product photos (JPG, PNG)</p>
          </div>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 hover:border-indigo-400'
          }`}
        >
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-gray-900 mb-2">Drag & drop images here</h3>
          <p className="text-gray-600 text-sm mb-4">or</p>
          <label className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-all cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Browse Files</span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={(e) => handleImageUpload(e.target.files)}
              className="hidden"
            />
          </label>
          <p className="text-gray-500 text-xs mt-3">Supported formats: JPG, PNG (Max 5MB each)</p>
        </div>

        {images.length > 0 && (
          <div className="mt-6">
            <h4 className="text-gray-700 text-sm mb-3">Uploaded Images ({images.length})</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Product ${index + 1}`}
                    className="w-full h-32 object-cover rounded-xl border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Inventory Details Section */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-gray-900 text-lg">Inventory Details</h2>
            <p className="text-gray-600 text-sm">Set initial stock quantity</p>
          </div>
        </div>

        <div>
          <label className="block text-gray-700 text-sm mb-2">
            Initial Stock Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={initialStock}
            onChange={(e) => setInitialStock(e.target.value)}
            placeholder="0"
            min="0"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          <p className="text-gray-500 text-xs mt-1.5">
            Enter the number of units currently available in stock
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-gray-50 pt-6 pb-2 -mx-8 px-8 border-t border-gray-200">
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 rounded-xl text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all"
          >
            <XCircle className="w-4 h-4" />
            <span>Cancel</span>
          </button>
          
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 shadow-md hover:shadow-lg transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Product</span>
          </button>
        </div>
      </div>
    </form>
  );
}
