import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState('');
  const [dateDeparture, setDateDeparture] = useState('');
  const [dateReturn, setDateReturn] = useState('');
  const [price, setPrice] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [voyages, setVoyages] = useState([]);
  const [filteredVoyages, setFilteredVoyages] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
    fetchVoyages();
  }, [navigate]);

  useEffect(() => {
    const filtered = voyages.filter(v =>
      v?.title?.toLowerCase().includes(search.toLowerCase()) ||
      v?.destination?.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredVoyages(filtered);
  }, [search, voyages]);

  const fetchVoyages = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get('http://localhost:8080/api/voyages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVoyages(response.data);
    } catch (error) {
      console.error('Erreur chargement:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    if (!title || !description || !destination || !dateDeparture || !price || !maxParticipants) {
      setError('Champs requis manquants.');
      return;
    }

    setLoading(true);
    setError('');

    const requestData = {
      title,
      description,
      destination,
      dateDeparture,
      dateReturn,
      price: parseFloat(price),
      maxParticipants: parseInt(maxParticipants),
      currentParticipants: isEditing ? voyages.find(v => v.id === editId)?.currentParticipants || 0 : 0,
      status: isEditing ? voyages.find(v => v.id === editId)?.status || 'PLANNED' : 'PLANNED'
    };

    try {
      let response;
      if (isEditing) {
        response = await axios.put(`http://localhost:8080/api/voyages/${editId}`, requestData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVoyages(voyages.map(v => v.id === editId ? response.data : v));
        setIsEditing(false);
        setEditId(null);
      } else {
        response = await axios.post('http://localhost:8080/api/voyages', requestData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchVoyages();
      }

      setTitle('');
      setDescription('');
      setDestination('');
      setDateDeparture('');
      setDateReturn('');
      setPrice('');
      setMaxParticipants('');
      setShowForm(false);
      addChatMessage('Voyage ajouté avec succès!', 'bot');
    } catch (error) {
      setError("Erreur lors de l'envoi.");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (v) => {
    setIsEditing(true);
    setEditId(v.id);
    setTitle(v.title);
    setDescription(v.description);
    setDestination(v.destination);
    setDateDeparture(v.dateDeparture);
    setDateReturn(v.dateReturn || '');
    setPrice(v.price.toString());
    setMaxParticipants(v.maxParticipants.toString());
    setShowForm(true);
  };

  const deleteVoyage = async (id) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:8080/api/voyages/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchVoyages();
    } catch (err) {
      console.error('Suppression échouée:', err);
    }
  };

  const addChatMessage = (message, sender = 'user') => {
    setChatMessages(prev => [...prev, { text: message, sender }]);
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    addChatMessage(userInput, 'user');
    setChatLoading(true);

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCjIthhhKmPcTJ0S8t2NUdCQXrtf-_lDhw`, // Remplacez par votre clé via .env
        {
          contents: [{ parts: [{ text: userInput }] }]
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const botResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "Je suis là pour vous aider à planifier un voyage. Dites-moi le titre, la destination, la date de départ, le prix et le nombre maximum de participants.";
      addChatMessage(botResponse, 'bot');

      if (userInput.toLowerCase().includes('ajouter voyage')) {
        const [t, d, dest, dep, p, max] = userInput.split(',').map(s => s.trim());
        if (t && d && dest && dep && p && max) {
          setTitle(t.replace('titre:', '').trim());
          setDescription(d.replace('description:', '').trim());
          setDestination(dest.replace('destination:', '').trim());
          setDateDeparture(dep.replace('date:', '').trim());
          setPrice(p.replace('prix:', '').trim());
          setMaxParticipants(max.replace('participants:', '').trim());
          setShowForm(true);
          addChatMessage('Formulaire d\'ajout de voyage prêt. Remplissez-le ou modifiez les détails.', 'bot');
        }
      }
    } catch (error) {
      console.error('Erreur API:', error.response ? error.response.data : error.message);
      addChatMessage('Désolé, une erreur s\'est produite. Essayez à nouveau.', 'bot');
    } finally {
      setUserInput('');
      setChatLoading(false);
    }
  };

  if (!localStorage.getItem('token')) return null;

  return (
    <div className="auth-container w-full min-h-screen px-6 py-6 flex flex-col">
      <div className="w-full fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-10 py-4 bg-white/70 backdrop-blur-md shadow-md">
        <h1 className="text-xl font-bold text-[#0B4263] whitespace-nowrap">MyTravelSite</h1>
        <div className="flex-1 px-10">
          <input
            type="text"
            placeholder="Rechercher un voyage..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 rounded-md border border-gray-300 text-gray-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#229CA7]"
          />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              localStorage.removeItem('token');
              navigate('/login');
            }}
            className="auth-button bg-red-600 hover:bg-red-700"
          >
            Déconnexion
          </button>
          <button
            onClick={() => {
              if (isEditing) {
                setIsEditing(false);
                setEditId(null);
                setTitle('');
                setDescription('');
                setDestination('');
                setDateDeparture('');
                setDateReturn('');
                setPrice('');
                setMaxParticipants('');
              }
              setShowForm(!showForm);
            }}
            className="auth-button"
          >
            {showForm ? 'Fermer' : 'Ajouter un voyage'}
          </button>
        </div>
      </div>

      <div className="pt-32 w-full">
        {showForm && (
          <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto mb-8 space-y-6"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1rem',
              padding: '1.25rem',
              boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
              color: '#1f2937',
              border: '1px solid #e5e7eb',
              zIndex: 5,
              position: 'relative'
            }}
          >
            {error && <div className="error-message">{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Titre</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 rounded-md border border-gray-300 text-gray-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#229CA7]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Destination</label>
                <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)}
                  className="w-full p-3 rounded-md border border-gray-300 text-gray-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#229CA7]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Date de départ</label>
                <input type="date" value={dateDeparture} onChange={(e) => setDateDeparture(e.target.value)}
                  className="w-full p-3 rounded-md border border-gray-300 text-gray-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#229CA7]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Date de retour</label>
                <input type="date" value={dateReturn} onChange={(e) => setDateReturn(e.target.value)}
                  className="w-full p-3 rounded-md border border-gray-300 text-gray-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#229CA7]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Prix (MAD)</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                  className="w-full p-3 rounded-md border border-gray-300 text-gray-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#229CA7]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Participants max</label>
                <input type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)}
                  className="w-full p-3 rounded-md border border-gray-300 text-gray-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#229CA7]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                className="w-full p-3 rounded-md border border-gray-300 text-gray-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#229CA7]"
              />
            </div>
            <button type="submit" className="auth-button w-full">
              {loading ? (isEditing ? 'Modification...' : 'Ajout...') : isEditing ? 'Enregistrer les modifications' : 'Ajouter le voyage'}
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVoyages.map((v) => (
            <div
              key={v.id}
              className="space-y-2"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '1rem',
                padding: '1.25rem',
                boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                color: '#1f2937',
                border: '1px solid #e5e7eb',
                zIndex: 5,
                position: 'relative'
              }}
            >
              <h3 className="text-xl font-bold text-[#0B4263] mb-2">{v.title}</h3>
              <p className="italic text-gray-600 mb-2">{v.description}</p>
              <p><strong>Destination:</strong> {v.destination}</p>
              <p><strong>Dates:</strong> {v.dateDeparture} → {v.dateReturn || '—'}</p>
              <p><strong>Prix:</strong> {v.price} MAD</p>
              <p><strong>Participants:</strong> {v.maxParticipants}</p>
              <div className="mt-4 space-x-2">
                <button onClick={() => startEdit(v)} className="bg-yellow-500 text-white px-4 py-1 rounded hover:bg-yellow-600">Modifier</button>
                <button onClick={() => deleteVoyage(v.id)} className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700">Supprimer</button>
              </div>
            </div>
          ))}
        </div>

        {/* Chatbot Widget */}
        <div className="fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 bg-[#229CA7] text-white rounded-t-lg">Chatbot Voyage</div>
          <div className="p-4 h-64 overflow-y-auto">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`mb-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block p-2 rounded-lg ${msg.sender === 'user' ? 'bg-blue-200' : 'bg-gray-200'}`}>
                  {msg.text}
                </span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChatSubmit} className="p-2 border-t flex">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-[#229CA7]"
              placeholder="Posez une question ou entrez 'ajouter voyage, titre:..., description:..., destination:..., date:..., prix:..., participants:...'"
              disabled={chatLoading}
            />
            <button type="submit" className="bg-[#229CA7] text-white p-2 rounded-r-lg hover:bg-[#1A7A7F]" disabled={chatLoading}>
              {chatLoading ? '...' : 'Envoyer'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Home;