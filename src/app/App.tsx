import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { router } from './routes';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ErrorBoundary title="Error en la aplicación">
          <RouterProvider router={router} />
        </ErrorBoundary>
        <Toaster
          position="top-right"
          richColors={false}
          toastOptions={{
            style: { fontFamily: 'inherit' },
          }}
        />
      </CartProvider>
    </AuthProvider>
  );
}