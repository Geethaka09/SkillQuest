import Navbar from './Navbar';
import '../styles/layout.css';

/**
 * Layout Component
 * 
 * Functions as the main wrapper for authenticated pages.
 * - Includes the Navigation Bar.
 * - Centers content within a constraint container (`main-content`).
 * - Applies global layout styles.
 */
const Layout = ({ children }) => {
    return (
        <div className="layout">
            <Navbar />
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

export default Layout;
