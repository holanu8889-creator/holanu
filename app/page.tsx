export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">HOLANU – Marketplace Properti Digital</h1>
          <p className="text-xl md:text-2xl mb-6">Platform jual, beli, dan sewa properti di Indonesia</p>
          <span className="inline-block bg-yellow-500 text-black px-4 py-2 rounded-full font-semibold">Under Development</span>
        </div>
      </section>

      {/* About Us */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Tentang Kami</h2>
          <p className="text-lg text-center max-w-2xl mx-auto">
            HOLANU adalah marketplace properti digital yang menghubungkan penjual, pembeli, dan penyewa properti di seluruh Indonesia. Kami menyediakan platform yang aman dan mudah untuk transaksi properti.
          </p>
        </div>
      </section>

      {/* Layanan Utama */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Layanan Utama</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <h3 className="text-xl font-semibold mb-4">Jual Properti</h3>
              <p>Jual rumah, tanah, ruko, dan properti lainnya dengan mudah.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <h3 className="text-xl font-semibold mb-4">Sewa Properti</h3>
              <p>Temukan properti sewa yang sesuai dengan kebutuhan Anda.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <h3 className="text-xl font-semibold mb-4">Listing Agent</h3>
              <p>Dapatkan bantuan dari agen properti profesional.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <h3 className="text-xl font-semibold mb-4">Properti Premium</h3>
              <p>Akses properti featured dan premium untuk investasi terbaik.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Kontak Resmi */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Kontak Resmi</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="text-xl font-semibold mb-4">WhatsApp</h3>
              <p>+62 812-3456-7890</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Email</h3>
              <p>info@holanu.com</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Domisili</h3>
              <p>Indonesia</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 HOLANU. Website ini masih dalam tahap pengembangan.</p>
        </div>
      </footer>
    </main>
  )
}