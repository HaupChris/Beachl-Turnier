import { useState, useRef } from 'react';
import { useTournament } from '../context/TournamentContext';

export function Photos() {
  const { currentTournament, dispatch } = useTournament();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentTournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Kein Turnier ausgewählt</p>
      </div>
    );
  }

  const photos = currentTournament.photos || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;

        // Resize image to reduce storage size
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 1200;
          let { width, height } = img;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

          dispatch({
            type: 'ADD_PHOTO',
            payload: {
              tournamentId: currentTournament.id,
              photo: {
                dataUrl: resizedDataUrl,
                caption: '',
              },
            },
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    if (confirm('Foto wirklich löschen?')) {
      dispatch({
        type: 'DELETE_PHOTO',
        payload: { tournamentId: currentTournament.id, photoId },
      });
      setSelectedPhoto(null);
    }
  };

  const handleSaveCaption = (photoId: string) => {
    dispatch({
      type: 'UPDATE_PHOTO_CAPTION',
      payload: { tournamentId: currentTournament.id, photoId, caption: captionText },
    });
    setEditingCaption(null);
  };

  const startEditCaption = (photoId: string, currentCaption: string) => {
    setEditingCaption(photoId);
    setCaptionText(currentCaption);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Fotos</h2>
        <span className="text-sm text-gray-500">{photos.length} Fotos</span>
      </div>

      {/* Upload Button */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex flex-col items-center"
        >
          <span className="text-2xl mb-2">📷</span>
          <span className="font-medium">Fotos hochladen</span>
          <span className="text-xs text-gray-400 mt-1">Tippen zum Auswählen</span>
        </button>
      </div>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-12 bg-gray-100 rounded-lg">
          <span className="text-4xl mb-4 block">📸</span>
          <p className="text-gray-500">Noch keine Fotos hochgeladen</p>
          <p className="text-sm text-gray-400 mt-2">
            Lade Teamfotos oder Siegerfotos hoch
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map(photo => (
            <div
              key={photo.id}
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => setSelectedPhoto(photo.id)}
            >
              <img
                src={photo.dataUrl}
                alt={photo.caption || 'Turnierfoto'}
                className="w-full h-full object-cover"
              />
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate">
                  {photo.caption}
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
          ))}
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex flex-col"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="flex justify-between items-center p-4">
            <button
              onClick={e => {
                e.stopPropagation();
                handleDeletePhoto(selectedPhoto);
              }}
              className="text-red-400 hover:text-red-300 p-2"
            >
              🗑️ Löschen
            </button>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="text-white hover:text-gray-300 p-2"
            >
              ✕ Schließen
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4">
            {(() => {
              const photo = photos.find(p => p.id === selectedPhoto);
              if (!photo) return null;
              return (
                <img
                  src={photo.dataUrl}
                  alt={photo.caption || 'Turnierfoto'}
                  className="max-w-full max-h-full object-contain"
                  onClick={e => e.stopPropagation()}
                />
              );
            })()}
          </div>

          <div className="p-4" onClick={e => e.stopPropagation()}>
            {(() => {
              const photo = photos.find(p => p.id === selectedPhoto);
              if (!photo) return null;

              if (editingCaption === photo.id) {
                return (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={captionText}
                      onChange={e => setCaptionText(e.target.value)}
                      placeholder="Bildunterschrift eingeben..."
                      className="flex-1 px-3 py-2 rounded-lg bg-white/10 text-white placeholder-gray-400 border border-white/20"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveCaption(photo.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                    >
                      Speichern
                    </button>
                    <button
                      onClick={() => setEditingCaption(null)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg"
                    >
                      Abbrechen
                    </button>
                  </div>
                );
              }

              return (
                <div
                  className="text-center text-white cursor-pointer hover:text-blue-300"
                  onClick={() => startEditCaption(photo.id, photo.caption)}
                >
                  {photo.caption || (
                    <span className="text-gray-400 italic">
                      Tippen um Bildunterschrift hinzuzufügen
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
