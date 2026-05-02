import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, Copy, Search, Download, Upload, Folder, FolderOpen, X, ChevronLeft,
} from 'lucide-react';
import { Button, Card, Input } from '@/components/common/ui';
import {
  listPatterns, deletePattern, savePattern, newId, exportAll, importAll,
  listProjects, saveProject, deleteProject, getProject, addPatternToProject,
  removePatternFromProject,
  type SavedPattern, type Project,
} from '@/lib/db';
import { useSettings } from '@/store/settings';
import { t } from '@/lib/i18n';

const PROJECT_COLORS = [
  '#A65A40', '#5F839A', '#9FB7C7', '#C9AE82', '#8AA063', '#D29475',
];
const PROJECT_ICONS = ['🐻', '🐱', '🐶', '🐰', '🦊', '🦁', '🐸', '🦒', '🐢', '🐧', '🦆', '🦛', '🦫', '🦕'];

export function LibraryPage() {
  const { language } = useSettings();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'projects' | 'patterns'>('projects');
  const [patterns, setPatterns] = useState<SavedPattern[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [openProject, setOpenProject] = useState<Project | null>(null);

  useEffect(() => { void refresh(); }, []);

  async function refresh() {
    const [p, pr] = await Promise.all([listPatterns(), listProjects()]);
    setPatterns(p);
    setProjects(pr);
    if (openProject) {
      const fresh = pr.find((x) => x.id === openProject.id);
      setOpenProject(fresh ?? null);
    }
  }

  async function handleDeletePattern(id: string) {
    if (!confirm(t('confirm_delete', language))) return;
    await deletePattern(id);
    void refresh();
  }

  async function handleDuplicate(p: SavedPattern) {
    await savePattern({
      ...p, id: newId(),
      name: `${p.name} (copia)`,
      createdAt: Date.now(), updatedAt: Date.now(),
    });
    void refresh();
  }

  async function handleExportAll() {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `achis-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    const text = await file.text();
    await importAll(JSON.parse(text));
    void refresh();
  }

  if (openProject) {
    return (
      <ProjectDetail
        project={openProject}
        patterns={patterns}
        language={language}
        onBack={() => setOpenProject(null)}
        onChange={refresh}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-3xl text-cream-900">{t('library_title', language)}</h1>
          <div className="flex gap-2">
            <label className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all bg-cream-100 text-cream-800 hover:bg-cream-200 px-3 py-1.5 text-sm">
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
              />
              <Upload size={14} />
            </label>
            <Button variant="secondary" size="sm" onClick={handleExportAll}>
              <Download size={14} />
            </Button>
            {tab === 'projects' ? (
              <Button
                variant="primary" size="sm"
                onClick={() => createNewProject(refresh)}
              >
                <Plus size={14} />
                {language === 'es' ? 'Nuevo proyecto' : 'New project'}
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => navigate('/app/visualizador')}>
                <Plus size={14} />
                {language === 'es' ? 'Nuevo patrón' : 'New pattern'}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-cream-200">
          <button
            onClick={() => setTab('projects')}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
              tab === 'projects'
                ? 'border-terracotta-500 text-terracotta-700'
                : 'border-transparent text-cream-600 hover:text-cream-800'
            }`}
          >
            {language === 'es' ? 'Proyectos' : 'Projects'}{' '}
            <span className="text-cream-400 ml-1">({projects.length})</span>
          </button>
          <button
            onClick={() => setTab('patterns')}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
              tab === 'patterns'
                ? 'border-terracotta-500 text-terracotta-700'
                : 'border-transparent text-cream-600 hover:text-cream-800'
            }`}
          >
            {language === 'es' ? 'Patrones' : 'Patterns'}{' '}
            <span className="text-cream-400 ml-1">({patterns.length})</span>
          </button>
        </div>

        <div className="mb-6 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-2.5 text-cream-500" />
            <input
              type="text"
              placeholder={t('search', language)}
              className="w-full rounded-lg border border-cream-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-terracotta-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {tab === 'projects' ? (
          <ProjectsGrid
            projects={projects}
            patterns={patterns}
            search={search}
            language={language}
            onOpen={setOpenProject}
            onDelete={async (id) => {
              if (!confirm(t('confirm_delete', language))) return;
              await deleteProject(id);
              void refresh();
            }}
            onCreate={() => createNewProject(refresh)}
          />
        ) : (
          <PatternsGrid
            patterns={patterns.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))}
            language={language}
            onOpen={(id) => navigate(`/app/visualizador?id=${id}`)}
            onDelete={handleDeletePattern}
            onDuplicate={handleDuplicate}
          />
        )}
      </div>
    </div>
  );
}

async function createNewProject(refresh: () => Promise<void>) {
  const name = prompt('Nombre del proyecto:');
  if (!name) return;
  await saveProject({
    id: newId(),
    name,
    color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
    icon: PROJECT_ICONS[Math.floor(Math.random() * PROJECT_ICONS.length)],
    patternIds: [],
    isCompleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  void refresh();
}

// ─── Projects grid ────────────────────────────────────────────────────────

function ProjectsGrid({
  projects, patterns, search, language, onOpen, onDelete, onCreate,
}: {
  projects: Project[];
  patterns: SavedPattern[];
  search: string;
  language: 'es' | 'en';
  onOpen: (p: Project) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  if (filtered.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="mb-4 text-cream-700">
          {language === 'es' ? 'Todavía no tenés proyectos. Creá uno para agrupar las piezas de un amigurumi.' : "No projects yet. Create one to group the pieces of an amigurumi."}
        </p>
        <Button variant="primary" onClick={onCreate}>
          <Plus size={14} />
          {language === 'es' ? 'Crear proyecto' : 'Create project'}
        </Button>
      </Card>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {filtered.map((proj) => {
        const piecesCount = proj.patternIds.length;
        const piecesNames = proj.patternIds
          .map((id) => patterns.find((p) => p.id === id)?.name)
          .filter(Boolean)
          .slice(0, 3)
          .join(', ');
        return (
          <Card key={proj.id} className="overflow-hidden cursor-pointer hover:shadow-md transition" >
            <button
              onClick={() => onOpen(proj)}
              className="w-full text-left"
            >
              <div
                className="aspect-video flex items-center justify-center text-5xl"
                style={{ background: proj.color ? `linear-gradient(135deg, ${proj.color}30, ${proj.color}10)` : '#FAF1EC' }}
              >
                {proj.icon ?? '✨'}
              </div>
              <div className="p-3 space-y-1">
                <h3 className="font-medium text-cream-900 line-clamp-1">{proj.name}</h3>
                <p className="text-xs text-cream-500">
                  {piecesCount} {piecesCount === 1
                    ? (language === 'es' ? 'pieza' : 'piece')
                    : (language === 'es' ? 'piezas' : 'pieces')}
                </p>
                {piecesNames && (
                  <p className="text-[10px] text-cream-400 line-clamp-1">{piecesNames}</p>
                )}
              </div>
            </button>
            <div className="border-t border-cream-100 p-2 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => onDelete(proj.id)}>
                <Trash2 size={12} />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Patterns grid (orphaned patterns or all) ─────────────────────────────

function PatternsGrid({
  patterns, language, onOpen, onDelete, onDuplicate,
}: {
  patterns: SavedPattern[];
  language: 'es' | 'en';
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (p: SavedPattern) => void;
}) {
  if (patterns.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="mb-4 text-cream-700">{t('no_patterns_yet', language)}</p>
      </Card>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {patterns.map((p) => (
        <Card key={p.id} className="overflow-hidden">
          <button onClick={() => onOpen(p.id)} className="w-full text-left">
            <div className="aspect-square bg-gradient-to-br from-cream-100 to-cream-50 flex items-center justify-center text-cream-400">
              {p.thumbnail ? (
                <img src={p.thumbnail} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="text-4xl text-terracotta-300">●</div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm text-cream-900 line-clamp-1">{p.name}</h3>
              <div className="flex items-center justify-between text-xs text-cream-500 mt-1">
                <span>{p.pattern.pieces.length} {t('pieces', language)}</span>
                <span>{new Date(p.updatedAt).toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}</span>
              </div>
            </div>
          </button>
          <div className="border-t border-cream-100 px-2 py-1.5 flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => onDuplicate(p)}>
              <Copy size={12} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(p.id)}>
              <Trash2 size={12} />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Project detail view ──────────────────────────────────────────────────

function ProjectDetail({
  project, patterns, language, onBack, onChange,
}: {
  project: Project;
  patterns: SavedPattern[];
  language: 'es' | 'en';
  onBack: () => void;
  onChange: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const projectPieces = project.patternIds
    .map((id) => patterns.find((p) => p.id === id))
    .filter(Boolean) as SavedPattern[];
  const orphanPatterns = patterns.filter((p) => !project.patternIds.includes(p.id));

  const totalGrams = projectPieces.reduce((sum, p) => {
    const g = p.pattern.pieces.reduce((s, piece) => s + piece.rounds.reduce((ss, r) => ss + r.stitchCount, 0), 0);
    return sum + g * 0.15;
  }, 0);

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-cream-600 hover:text-cream-800 mb-3"
        >
          <ChevronLeft size={16} />
          {language === 'es' ? 'Volver a proyectos' : 'Back to projects'}
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div
            className="h-20 w-20 rounded-2xl flex items-center justify-center text-4xl shrink-0"
            style={{ background: project.color ? `linear-gradient(135deg, ${project.color}40, ${project.color}15)` : '#FAF1EC' }}
          >
            {project.icon ?? '✨'}
          </div>
          <div className="flex-1">
            <h1 className="font-serif text-3xl text-cream-900">{project.name}</h1>
            <p className="text-sm text-cream-600">
              {projectPieces.length} {projectPieces.length === 1 ? (language === 'es' ? 'pieza' : 'piece') : (language === 'es' ? 'piezas' : 'pieces')}
              {projectPieces.length > 0 && ` · ~${Math.round(totalGrams)}g de hilo total`}
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} />
            {language === 'es' ? 'Agregar pieza' : 'Add piece'}
          </Button>
        </div>

        {projectPieces.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="mb-4 text-cream-700">
              {language === 'es' ? 'Este proyecto todavía no tiene piezas.' : 'This project has no pieces yet.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="primary" onClick={() => setShowAdd(true)}>
                <Plus size={14} />
                {language === 'es' ? 'Agregar pieza existente' : 'Add existing piece'}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/app/generador')}>
                {language === 'es' ? 'Generar pieza nueva' : 'Generate new piece'}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {projectPieces.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <button onClick={() => navigate(`/app/visualizador?id=${p.id}`)} className="w-full text-left">
                  <div className="aspect-square bg-gradient-to-br from-cream-100 to-cream-50 flex items-center justify-center text-cream-400">
                    <div className="text-4xl text-terracotta-300">●</div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm text-cream-900 line-clamp-1">{p.name}</h3>
                    <p className="text-xs text-cream-500">{p.pattern.pieces.length} {t('pieces', language)}</p>
                  </div>
                </button>
                <div className="border-t border-cream-100 p-2 flex justify-end">
                  <Button
                    variant="ghost" size="sm"
                    onClick={async () => {
                      await removePatternFromProject(project.id, p.id);
                      void onChange();
                    }}
                    title={language === 'es' ? 'Sacar del proyecto' : 'Remove from project'}
                  >
                    <X size={12} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {showAdd && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4"
            onClick={() => setShowAdd(false)}
          >
            <Card className="max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col" >
              <div className="p-4 border-b border-cream-200 flex items-center justify-between">
                <h3 className="font-serif text-lg text-cream-800">
                  {language === 'es' ? 'Agregar pieza al proyecto' : 'Add piece to project'}
                </h3>
                <button onClick={() => setShowAdd(false)} className="text-cream-500 hover:text-cream-800">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {orphanPatterns.length === 0 ? (
                  <p className="text-sm text-cream-600 text-center py-8">
                    {language === 'es' ? 'No hay patrones disponibles. Generá uno desde el generador.' : 'No patterns available. Generate one in the generator.'}
                  </p>
                ) : (
                  orphanPatterns.map((p) => (
                    <button
                      key={p.id}
                      onClick={async (e) => {
                        e.stopPropagation();
                        await addPatternToProject(project.id, p.id);
                        await onChange();
                        setShowAdd(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-cream-50 flex items-center gap-3"
                    >
                      <div className="text-xl">●</div>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-cream-800">{p.name}</div>
                        <div className="text-xs text-cream-500">{p.pattern.pieces.length} {t('pieces', language)}</div>
                      </div>
                      <Plus size={14} className="text-terracotta-500" />
                    </button>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
void Folder; void FolderOpen; void Input; void getProject;
