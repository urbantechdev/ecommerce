import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Product } from '../types';
import { useNotification } from '../context/NotificationContext';
import { ShoppingCart, CheckCircle2, User, X } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, getAuth, onAuthStateChanged } from 'firebase/auth';

export const PortalView: React.FC = () => {
  const { notify } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    api.getProducts().then(setProducts).catch(console.error);
    const auth = getAuth();
    onAuthStateChanged(auth, setUser);
  }, []);

  const handleGoogleLogin = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Login Failed', message: err.message });
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => [...prev, { product, quantity: 1 }]);
    notify({ type: 'SUCCESS', title: 'Added', message: `${product.name} added to cart` });
  };

  const total = cart.reduce((sum, item) => sum + item.product.sellingPrice, 0);

  const handleCheckout = async () => {
    if (!user) {
      handleGoogleLogin();
      return;
    }
    setIsProcessing(true);
    try {
      // Use api.createOrder if exists, otherwise mock
      await api.createOrder({ cart, customerId: user.uid, total });
      notify({ type: 'SUCCESS', title: 'Order Placed', message: 'Thank you for your purchase!' });
      setCart([]);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Checkout Failed', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm">
        <h1 className="font-black text-xl text-[#030A91]">Naisia Portal</h1>
        {user ? (
          <span className="text-xs font-bold text-slate-700">Hi, {user.displayName}</span>
        ) : (
          <button onClick={handleGoogleLogin} className="bg-[#030A91] text-white px-4 py-2 rounded-xl text-xs font-bold">
            Sign in with Google
          </button>
        )}
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {products.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">{p.name}</h3>
                <p className="text-xs text-slate-500">KES {p.sellingPrice.toLocaleString()}</p>
              </div>
              <button onClick={() => addToCart(p)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Add</button>
            </div>
          ))}
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm space-y-4">
          <h2 className="font-bold text-sm">Cart</h2>
          {cart.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <span>{item.product.name}</span>
              <span>KES {item.product.sellingPrice.toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t pt-3 font-black text-sm flex justify-between">
            <span>Total</span>
            <span>KES {total.toLocaleString()}</span>
          </div>
          <button onClick={handleCheckout} className="w-full bg-[#030A91] text-white py-3 rounded-xl text-xs font-bold">
            {isProcessing ? 'Processing...' : 'Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
};
