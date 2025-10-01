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

export function DinosaurSwitcher({
  setFaunaId,
  faunaId,
}: {
  setFaunaId: (id: number) => void;
  faunaId: number;
}) {
  const navigate = useNavigate();
  const dinosaurs = useUnlockedDinosaurs();

  return (
    <div className='flex flex-row items-center justify-center gap-8 !pt-4'>
      <img
        src='/arrowprevious.png'
        alt='previous'
        onClick={() => {
          const currentIndex = faunaId;
          const nextIndex =
            (currentIndex - 1 + dinosaurs.length) % dinosaurs.length;
          const nextDinoId = dinosaurs[nextIndex];
          setFaunaId(nextDinoId.id);
        }}
      />
      <div className='max-w-[800px] overflow-x-auto'>
        <ul className='flex flex-row gap-4 list-none p-0 m-0'>
          {dinosaurs.map(dino => (
            <li key={dino.id}>
              <div
                className='flex flex-col items-center gap-2'
                onClick={() => {
                  setFaunaId(dino.id);
                }}
              >
                <img
                  src={
                    faunaId === dino.id
                      ? `/bg-selectedfile.png`
                      : `/bg-unselectedfile.png`
                  }
                  className='w-16 h-auto object-cover'
                  alt={`Dinosaur ${dino.id}`}
                />
                <p>{dino.name.slice(0, 10)}...</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <img
        src='/arrownext.png'
        alt='next'
        onClick={() => {
          const currentIndex = faunaId;
          const nextIndex = (currentIndex + 1) % dinosaurs.length;
          const nextDinoId = dinosaurs[nextIndex];
          setFaunaId(nextDinoId.id);
        }}
      />
    </div>
  );
}
