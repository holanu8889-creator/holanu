export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
            Kebijakan Privasi HOLANU
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-8 text-center">
              Terakhir diperbarui: {new Date().toLocaleDateString('id-ID')}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Pengumpulan Informasi</h2>
              <p className="text-gray-700 mb-4">
                HOLANU mengumpulkan informasi yang Anda berikan secara langsung, seperti:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Nama dan informasi kontak</li>
                <li>Data akun Google (saat login dengan Google)</li>
                <li>Informasi properti yang Anda unggah</li>
                <li>Komunikasi dengan tim support</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Penggunaan Informasi</h2>
              <p className="text-gray-700 mb-4">
                Informasi yang kami kumpulkan digunakan untuk:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Menyediakan layanan marketplace properti</li>
                <li>Memproses transaksi properti</li>
                <li>Mengkomunikasikan update dan informasi penting</li>
                <li>Meningkatkan pengalaman pengguna platform</li>
                <li>Mematuhi persyaratan hukum dan regulasi</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Berbagi Informasi</h2>
              <p className="text-gray-700 mb-4">
                Kami tidak menjual atau menyewakan informasi pribadi Anda kepada pihak ketiga.
                Informasi hanya dibagikan dalam kondisi berikut:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Dengan izin eksplisit dari Anda</li>
                <li>Kepada penyedia layanan yang membantu operasi platform</li>
                <li>Untuk mematuhi persyaratan hukum</li>
                <li>Dalam rangka melindungi hak dan keselamatan pengguna</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Keamanan Data</h2>
              <p className="text-gray-700 mb-4">
                Kami menerapkan langkah-langkah keamanan teknis dan organisasi yang sesuai untuk melindungi
                informasi pribadi Anda dari akses, perubahan, pengungkapan, atau penghancuran yang tidak sah.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Cookies dan Teknologi Pelacakan</h2>
              <p className="text-gray-700 mb-4">
                Platform kami menggunakan cookies dan teknologi serupa untuk meningkatkan pengalaman pengguna,
                menganalisis penggunaan, dan menyediakan fitur yang dipersonalisasi.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Hak Pengguna</h2>
              <p className="text-gray-700 mb-4">
                Anda memiliki hak untuk:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>Mengakses informasi pribadi yang kami simpan</li>
                <li>Memperbaiki informasi yang tidak akurat</li>
                <li>Meminta penghapusan data Anda</li>
                <li>Menolak atau membatasi pemrosesan data</li>
                <li>Menerima salinan data dalam format yang dapat dibaca mesin</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Kontak Kami</h2>
              <p className="text-gray-700 mb-4">
                Jika Anda memiliki pertanyaan tentang kebijakan privasi ini atau ingin menggunakan hak Anda,
                silakan hubungi kami:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700"><strong>Email:</strong> privacy@holanu.com</p>
                <p className="text-gray-700"><strong>WhatsApp:</strong> +62 812-3456-7890</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Perubahan Kebijakan</h2>
              <p className="text-gray-700 mb-4">
                Kami dapat memperbarui kebijakan privasi ini dari waktu ke waktu. Perubahan signifikan
                akan diberitahukan melalui email atau pemberitahuan di platform.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 text-center">
            <a
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            >
              Kembali ke Home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}