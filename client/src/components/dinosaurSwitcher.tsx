import { useNavigate } from 'react-router';

function useUnlockedDinosaurs() {
  return [
    {
      id: 0,
      name: 'Tyrannosaurus Rex',
    },
    {
      id: 1,
      name: 'Triceratops',
    },
    {
      id: 2,
      name: 'Velociraptor',
    },
    {
      id: 3,
      name: 'Stegosaurus',
    },
    {
      id: 4,
      name: 'Brachiosaurus',
    },
    {
      id: 5,
      name: 'Allosaurus',
    },
    {
      id: 6,
      name: 'Spinosaurus',
    },
  ];
}

export function DinosaurSwitcher() {
  const navigate = useNavigate();
  const dinosaurs = useUnlockedDinosaurs();

  const currentDino = Number(
    new URLSearchParams(window.location.search).get('id') || '0',
  );

  return (
    <div className='flex flex-row items-center justify-center gap-8 !pt-4'>
      <img
        src='/arrowprevious.png'
        alt='previous'
        onClick={() => {
          const currentDino = new URLSearchParams(window.location.search).get(
            'id',
          );

          const currentIndex = currentDino
            ? Array.from(dinosaurs.keys()).indexOf(parseInt(currentDino, 10))
            : 0;

          const nextIndex =
            (currentIndex - 1 + dinosaurs.length) % dinosaurs.length;
          const nextDinoId = dinosaurs[nextIndex];

          navigate(`/fauna?id=${nextDinoId}`);
        }}
      />
      <div className='max-w-[800px] overflow-x-auto'>
        <ul className='flex flex-row gap-4 list-none p-0 m-0'>
          {dinosaurs.map(dino => (
            <li key={dino.id}>
              <a
                className='flex flex-col items-center gap-2'
                href={`/fauna?id=${dino.id}`}
              >
                <img
                  src={
                    currentDino === dino.id
                      ? `/bg-selectedfile.png`
                      : `/bg-unselectedfile.png`
                  }
                  className='w-16 h-auto object-cover'
                  alt={`Dinosaur ${dino.id}`}
                />
                <p>{dino.name.slice(0, 10)}...</p>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <img
        src='/arrownext.png'
        alt='next'
        onClick={() => {
          const currentDino = new URLSearchParams(window.location.search).get(
            'id',
          );

          const currentIndex = currentDino
            ? Array.from(dinosaurs.keys()).indexOf(parseInt(currentDino, 10))
            : 0;

          const nextIndex = (currentIndex + 1) % dinosaurs.length;
          const nextDinoId = dinosaurs[nextIndex];

          navigate(`/fauna?id=${nextDinoId}`);
        }}
      />
    </div>
  );
}
