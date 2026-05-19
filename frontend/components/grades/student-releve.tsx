'use client';

type ReleveGrade = {
  id: number;
  score: number;
  maxScore: number;
  rattrapageScore?: number | null;
  rattrapageMaxScore?: number | null;
  academicYear: string;
  semester?: string | null;
  assessmentType?: string | null;
  subject?: string | null;
  module?: { id: number; name: string; semestre?: string | null } | null;
  elementModule?: { id: number; name: string; type?: string | null; ponderation?: number | null } | null;
  academicClass?: { id: number; name: string; year: number } | null;
};

type StudentReleveProps = {
  student: {
    fullName: string;
    codeMassar?: string | null;
    codeEtudiant?: string | null;
    academicClass?: { id?: number; name: string; year: number } | null;
    filiere?: { name: string } | null;
  } | null;
  grades: ReleveGrade[];
  title?: string;
};

const fmtScore = (score: number, maxScore: number) =>
  maxScore === 20 ? score.toFixed(2) : ((score / maxScore) * 20).toFixed(2);

const fmtAvg = (value: number | null) => (value === null ? '-' : value.toFixed(2));

const hasRattrapage = (grade: ReleveGrade) =>
  grade.rattrapageScore !== undefined && grade.rattrapageScore !== null;

const finalScore = (grade: ReleveGrade) =>
  hasRattrapage(grade)
    ? {
        score: grade.rattrapageScore as number,
        maxScore: grade.rattrapageMaxScore ?? grade.maxScore,
      }
    : { score: grade.score, maxScore: grade.maxScore };

const normalizedScore = (grade: ReleveGrade, mode: 'before' | 'after') => {
  const value = mode === 'after' ? finalScore(grade) : { score: grade.score, maxScore: grade.maxScore };
  return value.maxScore > 0 ? (value.score / value.maxScore) * 20 : value.score;
};

const mentionColor = (value: number | null) => {
  if (value === null) return 'text-slate-400';
  if (value < 10) return 'text-red-600';
  if (value < 12) return 'text-amber-700';
  return 'text-emerald-700';
};

export function StudentReleve({ student, grades, title = 'Relevé de Notes' }: StudentReleveProps) {
  const grouped = grades.reduce<Record<string, ReleveGrade[]>>((acc, grade) => {
    const key = grade.academicYear || 'Sans année';
    (acc[key] ??= []).push(grade);
    return acc;
  }, {});

  const years = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));

  if (grades.length === 0) {
    return <p className="text-sm text-slate-400">Aucune note enregistrée pour cet étudiant.</p>;
  }

  const releveModes: Array<{ key: 'before' | 'after'; title: string }> = [
    { key: 'before', title: `${title} avant rattrapage` },
    ...(grades.some(hasRattrapage)
      ? [{ key: 'after' as const, title: `${title} après rattrapage` }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {releveModes.flatMap((mode) => years.map(([year, rows]) => {
        const average = rows.length
          ? rows.reduce((sum, grade) => sum + normalizedScore(grade, mode.key), 0) / rows.length
          : null;
        const classInfo = rows[0]?.academicClass ?? student?.academicClass ?? null;
        const moduleRows = rows.reduce<Record<string, ReleveGrade[]>>((acc, grade) => {
          const key = grade.module?.name ?? grade.subject ?? 'Module';
          (acc[key] ??= []).push(grade);
          return acc;
        }, {});

        return (
          <section key={`${mode.key}-${year}`} className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Institut Agronomique et Vétérinaire Hassan II
              </p>
              <h2 className="text-lg font-bold text-slate-900">{mode.title}</h2>
              <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-sm text-slate-600">
                <span><span className="text-slate-400">Étudiant :</span> <strong>{student?.fullName ?? '-'}</strong></span>
                <span><span className="text-slate-400">Code Massar :</span> <strong>{student?.codeMassar ?? '-'}</strong></span>
                {student?.codeEtudiant ? <span><span className="text-slate-400">Code étudiant :</span> <strong>{student.codeEtudiant}</strong></span> : null}
                {classInfo ? <span><span className="text-slate-400">Classe :</span> <strong>{classInfo.name} ({classInfo.year})</strong></span> : null}
                {student?.filiere ? <span><span className="text-slate-400">Filière :</span> <strong>{student.filiere.name}</strong></span> : null}
                <span><span className="text-slate-400">Année :</span> <strong>{year}</strong></span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-4 py-2.5 text-left font-semibold text-slate-700">Module</th>
                    <th className="border border-slate-300 px-4 py-2.5 text-left font-semibold text-slate-700">Élément de module</th>
                    <th className="border border-slate-300 px-2 py-2.5 text-center font-semibold text-slate-700">Type</th>
                    <th className="border border-slate-300 px-2 py-2.5 text-center font-semibold text-slate-700">Pond.</th>
                    <th className="border border-slate-300 px-2 py-2.5 text-center font-semibold text-slate-700">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(moduleRows).map(([moduleName, moduleGrades]) => {
                    const moduleAverage = moduleGrades.length
                      ? moduleGrades.reduce((sum, grade) => sum + normalizedScore(grade, mode.key), 0) / moduleGrades.length
                      : null;
                    return moduleGrades.map((grade, index) => {
                      const display = mode.key === 'after' ? finalScore(grade) : { score: grade.score, maxScore: grade.maxScore };
                      return (
                      <tr key={grade.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        {index === 0 ? (
                          <td rowSpan={moduleGrades.length} className="border border-slate-200 px-4 py-2 align-top font-semibold text-slate-800">
                            <div>{moduleName}</div>
                            {(grade.module?.semestre || grade.semester) ? (
                              <div className="text-xs font-normal text-slate-400">{grade.module?.semestre ?? grade.semester}</div>
                            ) : null}
                            <div className="mt-2 text-xs text-slate-600">
                              Moyenne générale du module : <span className={`font-bold ${mentionColor(moduleAverage)}`}>{fmtAvg(moduleAverage)}</span>
                            </div>
                          </td>
                        ) : null}
                        <td className="border border-slate-200 px-4 py-2 text-slate-700">{grade.elementModule?.name ?? grade.subject ?? '-'}</td>
                        <td className="border border-slate-200 px-2 py-2 text-center text-xs text-slate-500">{grade.elementModule?.type ?? grade.assessmentType ?? '-'}</td>
                        <td className="border border-slate-200 px-2 py-2 text-center text-xs text-slate-500">{grade.elementModule?.ponderation ?? 1}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center font-medium">
                          <span className={normalizedScore(grade, mode.key) < 10 ? 'text-red-600' : 'text-slate-900'}>
                            {fmtScore(display.score, display.maxScore)}
                          </span>
                        </td>
                      </tr>
                    );
                    });
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-50 font-bold">
                    <td colSpan={4} className="border border-slate-300 px-4 py-3 text-right text-slate-800">
                      Moyenne générale de l'étudiant
                    </td>
                    <td className={`border border-slate-300 px-3 py-3 text-center text-base ${mentionColor(average)}`}>
                      {fmtAvg(average)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-center">
                <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Note générale</p>
                <p className={`text-2xl font-bold ${mentionColor(average)}`}>{fmtAvg(average)}</p>
              </div>
              <div className="flex-1 space-y-1 rounded-2xl border border-slate-200 px-6 py-4 text-center">
                <p className="text-xs uppercase tracking-widest text-slate-500">Signature du directeur</p>
                <div className="mt-2 h-16 border-b border-dashed border-slate-300" />
                <p className="text-xs text-slate-400">Cachet et signature</p>
              </div>
            </div>
          </section>
        );
      }))}
    </div>
  );
}
