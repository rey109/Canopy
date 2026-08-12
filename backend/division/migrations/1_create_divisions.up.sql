CREATE TABLE divisions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    chair_nis VARCHAR(50) DEFAULT NULL
);

INSERT INTO divisions (name, description) VALUES
('Pembinaan Keimanan & Ketaqwaan Terhadap Tuhan YME', 'Fokus pada pengembangan spiritualitas, perayaan hari besar keagamaan, dan toleransi antar umat beragama.'),
('Pembinaan Budi Pekerti Luhur / Akhlak Mulia', 'Fokus pada pembinaan tata krama, kepedulian sosial, ketertiban siswa, dan kegiatan sosial/amal.'),
('Pembinaan Kepribadian Unggul, Wawasan Kebangsaan, Bela Negara', 'Fokus pada wawasan kebangsaan, bela negara, upacara bendera, pramuka, Paskibra, dan cinta tanah air.'),
('Pembinaan Prestasi Akademik, Seni, Olahraga', 'Fokus pada peningkatan prestasi akademik (OSN, debat), perlombaan seni, olahraga (classmeet, turnamen), dan ekstrakurikuler.'),
('Demokrasi, HAM, Politik, Lingkungan Hidup, Toleransi Sosial', 'Fokus pada kegiatan demokrasi (pemilihan ketua OSIS), pelestarian lingkungan hidup, kebersihan sekolah, dan keadilan sosial.'),
('Pembinaan Kreativitas, Keterampilan, Kewirausahaan', 'Fokus pada pengembangan keterampilan, koperasi sekolah, event wirausaha siswa, bazar, dan kreativitas mandiri.'),
('Pembinaan Kualitas Jasmani, Kesehatan, Gizi', 'Fokus pada UKS, penyuluhan kesehatan dan gizi, PMR, kantin sehat, dan kebugaran siswa.'),
('Pembinaan Sastra & Budaya', 'Fokus pada majalah dinding (mading), penerbitan karya sastra, pentas budaya, apresiasi film, dan teater.'),
('Pembinaan Teknologi Informasi & Komunikasi', 'Fokus pada dokumentasi multimedia, website sekolah, pengelolaan media sosial, siaran sekolah, dan edukasi TIK.'),
('Pembinaan Komunikasi Bahasa Asing', 'Fokus pada English Club, lomba debat bahasa asing, komunitas pidato bahasa asing, dan pelatihan bahasa.');
