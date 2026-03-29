import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Leaf, 
  ShoppingBag, 
  MessageSquare, 
  Info, 
  ChevronRight, 
  Star, 
  X, 
  Menu, 
  LogIn, 
  LogOut, 
  CheckCircle2,
  Camera,
  MapPin,
  Phone,
  Mail,
  User as UserIcon
} from 'lucide-react';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logOut, 
  OperationType, 
  handleFirestoreError 
} from './firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  Timestamp, 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Product, Order, Review, OrderItem } from './types';

// --- Components ---

const Navbar = ({ user, onLogin, onLogout }: { user: User | null, onLogin: () => void, onLogout: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-warm-bg/80 backdrop-blur-md border-b border-black/5">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Leaf className="text-warm-accent w-6 h-6" />
          <span className="text-xl font-serif font-bold tracking-tight">김천 제철 농산물</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#intro" className="hover:text-warm-accent transition-colors">농장 소개</a>
          <a href="#process" className="hover:text-warm-accent transition-colors">생산 과정</a>
          <a href="#products" className="hover:text-warm-accent transition-colors">제철 상품</a>
          <a href="#reviews" className="hover:text-warm-accent transition-colors">고객 후기</a>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-black/10" referrerPolicy="no-referrer" />
              <button onClick={onLogout} className="text-sm font-medium hover:text-warm-accent transition-colors flex items-center gap-1">
                <LogOut size={16} /> <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          ) : (
            <button onClick={onLogin} className="btn-primary flex items-center gap-2 text-sm">
              <LogIn size={16} /> 로그인
            </button>
          )}
          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            <Menu />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-warm-card border-b border-black/5 p-4 flex flex-col gap-4 shadow-lg"
          >
            <a href="#intro" onClick={() => setIsOpen(false)} className="text-lg font-serif">농장 소개</a>
            <a href="#process" onClick={() => setIsOpen(false)} className="text-lg font-serif">생산 과정</a>
            <a href="#products" onClick={() => setIsOpen(false)} className="text-lg font-serif">제철 상품</a>
            <a href="#reviews" onClick={() => setIsOpen(false)} className="text-lg font-serif">고객 후기</a>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => (
  <section className="pt-32 pb-20 px-4">
    <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <span className="text-warm-accent font-medium tracking-widest uppercase text-xs mb-4 block">경북 김천 산지 직송</span>
        <h1 className="text-5xl md:text-7xl font-serif font-light leading-tight mb-6">
          자연이 빚고 <br />
          <span className="italic font-medium text-warm-earth">정성</span>이 키운 <br />
          정직한 먹거리
        </h1>
        <p className="text-lg text-warm-ink/60 mb-8 max-w-md leading-relaxed">
          김천의 맑은 물과 비옥한 토양에서 생산자가 직접 씨앗부터 수확까지 책임지는 제철 농산물을 만나보세요.
        </p>
        <div className="flex gap-4">
          <a href="#products" className="btn-primary">상품 둘러보기</a>
          <a href="#intro" className="px-6 py-2 rounded-full border border-black/10 hover:bg-black/5 transition-all">농장 이야기</a>
        </div>
      </motion.div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl"
      >
        <img 
          src="https://picsum.photos/seed/farm-hero/1200/1200" 
          alt="Gimcheon Farm" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl max-w-xs">
          <p className="text-sm italic text-warm-ink/80">"가장 신선한 상태로 식탁까지 배달해 드리는 것이 저희의 약속입니다."</p>
          <p className="text-xs font-bold mt-2 text-warm-accent">— 김천 농부 김정직</p>
        </div>
      </motion.div>
    </div>
  </section>
);

const OrderModal = ({ product, onClose, user }: { product: Product, onClose: () => void, user: User | null }) => {
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    phone: '',
    address: '',
    quantity: 1,
    email: user?.email || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('주문을 위해 로그인이 필요합니다.');
      return;
    }
    setIsSubmitting(true);
    
    try {
      const orderData: Order = {
        customerName: formData.name,
        customerPhone: formData.phone,
        customerAddress: formData.address,
        customerEmail: formData.email,
        items: [{
          productId: product.id,
          productName: product.name,
          quantity: formData.quantity,
          price: product.price
        }],
        totalAmount: product.price * formData.quantity,
        status: 'pending',
        createdAt: Timestamp.now(),
        uid: user.uid
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      // Simulate email sending logic (GAS would be triggered here in a real scenario)
      console.log('Order submitted to GAS endpoint...');
      
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-warm-bg w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-black/5 rounded-full transition-colors">
          <X size={24} />
        </button>

        {isSuccess ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-warm-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-warm-accent w-10 h-10" />
            </div>
            <h2 className="text-3xl font-serif mb-4">주문이 완료되었습니다!</h2>
            <p className="text-warm-ink/60">
              입력하신 이메일({formData.email})로 <br />
              확인 메일이 발송되었습니다. <br />
              곧 생산자가 연락드리겠습니다.
            </p>
          </div>
        ) : (
          <div className="p-8 md:p-10">
            <h2 className="text-3xl font-serif mb-2">주문 신청하기</h2>
            <p className="text-warm-ink/60 mb-8">{product.name} — {product.price.toLocaleString()}원 / {product.unit}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-warm-ink/40 mb-1 block">성함</label>
                  <input 
                    required
                    type="text" 
                    className="input-field" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-warm-ink/40 mb-1 block">연락처</label>
                  <input 
                    required
                    type="tel" 
                    placeholder="010-0000-0000"
                    className="input-field" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-warm-ink/40 mb-1 block">이메일</label>
                <input 
                  required
                  type="email" 
                  className="input-field" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-warm-ink/40 mb-1 block">배송 주소</label>
                <input 
                  required
                  type="text" 
                  className="input-field" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-black/5">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">수량</span>
                  <div className="flex items-center border border-black/10 rounded-full overflow-hidden">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, quantity: Math.max(1, formData.quantity - 1)})}
                      className="px-3 py-1 hover:bg-black/5"
                    >
                      -
                    </button>
                    <span className="px-4 py-1 font-medium">{formData.quantity}</span>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, quantity: formData.quantity + 1})}
                      className="px-3 py-1 hover:bg-black/5"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-warm-ink/40">총 결제 금액</p>
                  <p className="text-2xl font-serif font-bold text-warm-earth">
                    {(product.price * formData.quantity).toLocaleString()}원
                  </p>
                </div>
              </div>

              <button 
                disabled={isSubmitting}
                type="submit" 
                className="w-full btn-primary py-4 text-lg mt-4 disabled:opacity-50"
              >
                {isSubmitting ? '처리 중...' : '신청 완료하기'}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newReview, setNewReview] = useState({ content: '', rating: 5 });
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) {
        // Sync user to Firestore
        const userRef = doc(db, 'users', u.uid);
        setDoc(userRef, {
          uid: u.uid,
          displayName: u.displayName,
          email: u.email,
          photoURL: u.photoURL,
          role: 'user'
        }, { merge: true });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Fetch Products (Mocking initial data if empty)
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      if (pList.length === 0 && user?.email === '1561skykig@gmail.com') {
        // Seed initial products if none exist and user is admin
        const initialProducts = [
          { name: '김천 샤인머스캣', price: 35000, unit: '2kg', description: '망고향 가득, 아삭한 식감의 명품 포도', imageUrl: 'https://picsum.photos/seed/grape/600/600', isAvailable: true, category: '과일' },
          { name: '햇 자두', price: 20000, unit: '3kg', description: '새콤달콤 김천의 대표 여름 과일', imageUrl: 'https://picsum.photos/seed/plum/600/600', isAvailable: true, category: '과일' },
          { name: '유기농 쌈채소', price: 12000, unit: '1kg', description: '매일 아침 수확하는 신선한 채소 모음', imageUrl: 'https://picsum.photos/seed/veg/600/600', isAvailable: true, category: '채소' },
        ];
        initialProducts.forEach(p => addDoc(collection(db, 'products'), p));
      }
      setProducts(pList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reviews'));
    return () => unsubscribe();
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('후기 작성을 위해 로그인이 필요합니다.');
      return;
    }
    if (!newReview.content.trim()) return;

    setIsReviewSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        uid: user.uid,
        authorName: user.displayName || '익명 고객',
        authorPhoto: user.photoURL,
        content: newReview.content,
        rating: newReview.rating,
        createdAt: Timestamp.now()
      });
      setNewReview({ content: '', rating: 5 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogin={signInWithGoogle} onLogout={logOut} />
      
      <Hero />

      {/* Intro Section */}
      <section id="intro" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="grid grid-cols-2 gap-4">
                <img src="https://picsum.photos/seed/farm1/600/800" alt="Farm life" className="rounded-3xl shadow-lg mt-8" referrerPolicy="no-referrer" />
                <img src="https://picsum.photos/seed/farm2/600/800" alt="Farm life" className="rounded-3xl shadow-lg" referrerPolicy="no-referrer" />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-4xl font-serif mb-6">김천의 흙과 땀이 <br />만들어낸 정직한 맛</h2>
              <p className="text-lg text-warm-ink/70 leading-relaxed mb-6">
                경북 김천의 조용한 시골 마을, 저희 농장은 대대로 이어온 땅의 생명력을 믿습니다. 
                화학 비료보다는 정성을, 대량 생산보다는 품질을 우선시하며 
                내 가족이 먹는다는 마음으로 농사를 짓습니다.
              </p>
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-warm-accent/10 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle2 className="text-warm-accent" size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold">100% 산지 직송</h4>
                    <p className="text-sm text-warm-ink/60">중간 유통 과정 없이 수확 즉시 배송하여 신선함이 다릅니다.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-warm-accent/10 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle2 className="text-warm-accent" size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold">친환경 재배 원칙</h4>
                    <p className="text-sm text-warm-ink/60">자연의 섭리를 거스르지 않는 건강한 농법을 고집합니다.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-24 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif mb-4">씨앗부터 식탁까지</h2>
            <p className="text-warm-ink/60">농부의 사계절, 그 정직한 기록입니다.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: '봄의 시작', desc: '정성껏 씨앗을 뿌리고 새싹을 돌봅니다.', img: 'spring' },
              { title: '여름의 햇살', desc: '뜨거운 태양 아래 열매가 익어갑니다.', img: 'summer' },
              { title: '가을의 결실', desc: '땀방울의 보람, 수확의 기쁨을 누립니다.', img: 'autumn' },
              { title: '겨울의 휴식', desc: '다음 해를 위해 땅을 쉬게 하고 준비합니다.', img: 'winter' },
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group cursor-pointer"
              >
                <div className="aspect-[3/4] rounded-[2rem] overflow-hidden mb-4 relative">
                  <img src={`https://picsum.photos/seed/process-${step.img}/600/800`} alt={step.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <p className="text-white text-sm">{step.desc}</p>
                  </div>
                </div>
                <h3 className="text-xl font-serif font-medium">{step.title}</h3>
                <p className="text-xs text-warm-ink/40 uppercase tracking-widest mt-1">Step 0{i+1}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-24 bg-warm-accent/5 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-4xl font-serif mb-2">지금 가장 맛있는 제철 상품</h2>
              <p className="text-warm-ink/60">김천 산지에서 갓 수확한 신선함을 담았습니다.</p>
            </div>
            <div className="flex gap-2">
              {['전체', '과일', '채소', '곡류'].map(cat => (
                <button key={cat} className="px-4 py-1 rounded-full border border-black/10 text-sm hover:bg-white transition-colors">
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {products.map((product) => (
              <motion.div 
                key={product.id}
                layoutId={product.id}
                className="card group"
              >
                <div className="aspect-square rounded-2xl overflow-hidden mb-6 relative">
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                  {!product.isAvailable && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="bg-white px-4 py-1 rounded-full text-sm font-bold">품절</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-2xl font-serif">{product.name}</h3>
                  <span className="text-xs font-bold text-warm-accent bg-warm-accent/10 px-2 py-1 rounded">{product.category}</span>
                </div>
                <p className="text-sm text-warm-ink/60 mb-6 line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl font-bold text-warm-earth">{product.price.toLocaleString()}원</span>
                    <span className="text-xs text-warm-ink/40 ml-1">/ {product.unit}</span>
                  </div>
                  <button 
                    disabled={!product.isAvailable}
                    onClick={() => setSelectedProduct(product)}
                    className="w-10 h-10 bg-warm-accent text-white rounded-full flex items-center justify-center shadow-lg shadow-warm-accent/20 hover:scale-110 transition-transform disabled:opacity-50"
                  >
                    <ShoppingBag size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-16">
            <div className="md:col-span-1">
              <h2 className="text-4xl font-serif mb-6">구매 고객님들의 <br />생생한 이야기</h2>
              <p className="text-warm-ink/60 mb-8">
                직접 드셔보신 분들이 증명하는 김천 농산물의 진심입니다. 
                여러분의 소중한 후기가 큰 힘이 됩니다.
              </p>
              
              {user ? (
                <form onSubmit={handleReviewSubmit} className="card p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button 
                        key={star}
                        type="button"
                        onClick={() => setNewReview({...newReview, rating: star})}
                        className={`${newReview.rating >= star ? 'text-yellow-500' : 'text-gray-300'}`}
                      >
                        <Star size={20} fill={newReview.rating >= star ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                  <textarea 
                    required
                    placeholder="맛있게 드셨나요? 후기를 남겨주세요."
                    className="input-field min-h-[100px] resize-none"
                    value={newReview.content}
                    onChange={e => setNewReview({...newReview, content: e.target.value})}
                  />
                  <button 
                    disabled={isReviewSubmitting}
                    type="submit" 
                    className="w-full btn-primary disabled:opacity-50"
                  >
                    {isReviewSubmitting ? '등록 중...' : '후기 등록하기'}
                  </button>
                </form>
              ) : (
                <div className="card p-8 text-center bg-warm-accent/5 border-dashed border-2">
                  <MessageSquare className="mx-auto mb-4 text-warm-accent/40" size={32} />
                  <p className="text-sm font-medium mb-4">로그인 후 후기를 작성하실 수 있습니다.</p>
                  <button onClick={signInWithGoogle} className="btn-primary text-sm">구글로 로그인하기</button>
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-6">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <motion.div 
                    key={review.id}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    className="card flex gap-6"
                  >
                    <img src={review.authorPhoto || ''} alt="" className="w-12 h-12 rounded-full shrink-0 border border-black/5" referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-sm">{review.authorName}</h4>
                          <div className="flex gap-0.5 text-yellow-500 mt-0.5">
                            {[...Array(review.rating)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                          </div>
                        </div>
                        <span className="text-[10px] text-warm-ink/30 uppercase tracking-widest">
                          {review.createdAt?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-warm-ink/80 text-sm leading-relaxed">{review.content}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-warm-ink/30 italic">
                  아직 작성된 후기가 없습니다. 첫 번째 후기의 주인공이 되어보세요!
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-warm-accent text-white py-20 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Leaf className="w-8 h-8" />
              <span className="text-2xl font-serif font-bold">김천 제철 농산물</span>
            </div>
            <p className="text-white/60 max-w-sm mb-8">
              경북 김천의 자연과 농부의 진심을 담아 가장 신선한 상태로 여러분의 식탁까지 배달합니다. 
              정직한 땀방울의 가치를 믿습니다.
            </p>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors">
                <Camera size={18} />
              </div>
              <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors">
                <Mail size={18} />
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-6">고객 센터</h4>
            <ul className="space-y-4 text-white/60 text-sm">
              <li className="flex items-center gap-2"><Phone size={14} /> 010-1234-5678</li>
              <li className="flex items-center gap-2"><Mail size={14} /> gimcheon_farm@email.com</li>
              <li className="flex items-center gap-2"><MapPin size={14} /> 경북 김천시 농소면 농장길 123</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">이용 안내</h4>
            <ul className="space-y-4 text-white/60 text-sm">
              <li>배송 안내</li>
              <li>교환 및 반품</li>
              <li>개인정보처리방침</li>
              <li>이용약관</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-white/10 text-center text-xs text-white/40">
          © 2026 김천 제철 농산물 직판장. All rights reserved.
        </div>
      </footer>

      <AnimatePresence>
        {selectedProduct && (
          <OrderModal 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
            user={user}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
