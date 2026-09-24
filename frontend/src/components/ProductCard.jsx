import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  return (
    <Link
      to="/explore"
      aria-label={`Explore koleksi HelcoBali: ${product.title}`}
      className="group relative flex flex-col font-sans focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-600"
    >
      <div className="relative w-full aspect-[4/5] bg-white overflow-hidden rounded-none flex items-center justify-center">
        <img
          src={product.image}
          alt={product.title}
          className="object-contain object-center w-full h-full p-6 group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        
        <div className="absolute bottom-0 left-0 w-full translate-y-0 md:translate-y-full md:group-hover:translate-y-0 md:group-focus-visible:translate-y-0 transition-transform duration-300 ease-in-out z-20">
          <span className="block w-full bg-[#111111] text-white text-xs font-bold uppercase tracking-widest py-4 text-center">
            Explore The Collection
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-col">
        <div className="flex justify-between items-start gap-2">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide leading-tight">
            {product.title}
          </h3>
          <span className="text-sm text-slate-900 font-medium whitespace-nowrap">
            {product.price}
          </span>
        </div>
        
        <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">
          {product.notes}
        </p>
        
        <p className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          {product.roast}
        </p>
      </div>
    </Link>
  );
}
