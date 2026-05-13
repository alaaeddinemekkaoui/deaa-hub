export type StudentOption = {
  id: number;
  fullName: string;
  codeMassar: string;
  codeEtudiant?: string | null;
  academicClass?: { id: number; name: string; year: number } | null;
  internatAssignment?: {
    id: number;
    roomId: number;
    comment?: string | null;
    room: { id: number; name: string };
  } | null;
};

export type Assignment = {
  id: number;
  comment?: string | null;
  student: {
    id: number;
    fullName: string;
    codeMassar: string;
    codeEtudiant?: string | null;
    academicClass?: { id: number; name: string; year: number } | null;
  };
};

export type Room = {
  id: number;
  name: string;
  capacity: number;
  assignments: Assignment[];
};

export type FlatAssignment = {
  id: number;
  room: { id: number; name: string; capacity?: number };
  student: StudentOption;
  comment?: string | null;
};
