import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Search,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type { Gender, Language, ProfessionPreset } from '../types';
import { PROFESSIONS_DB } from '../data/professions';
import { tr } from '../data/i18n';
import { calculateBiometrics, playSFX, type CreateProfileInput } from '../engine/science';

interface AwakeningViewProps {
  lang: Language;
  isCloudLoggedIn: boolean;
  onOpenCloudLogin: () => void;
  onCompleteAwakening: (input: CreateProfileInput) => void;
}

export const AwakeningView: React.FC<AwakeningViewProps> = ({
  lang,
  isCloudLoggedIn,
  onOpenCloudLogin,
  onCompleteAwakening,
}) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState(24);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(65);
  const [city, setCity] = useState('Surabaya');
  const [rewardInterest, setRewardInterest] = useState('');
  const [goal, setGoal] = useState('');
  const [targetLevel, setTargetLevel] = useState(15);
  const [dailyBudget, setDailyBudget] = useState(150);

  const [profSearch, setProfSearch] = useState('');
  const [profCat, setProfCat] = useState<'ALL' | 'AGRI' | 'BIZ' | 'TECH' | 'EDU'>('ALL');
  const [selectedPreset, setSelectedPreset] = useState<ProfessionPreset>(PROFESSIONS_DB[0]);
  const [isCustomProf, setIsCustomProf] = useState(false);
  const [customProfName, setCustomProfName] = useState('');

  const bioPreview = useMemo(
    () => calculateBiometrics(age, height, weight, gender, lang),
    [age, height, weight, gender, lang]
  );

  const filteredProfessions = useMemo(() => {
    const q = profSearch.toLowerCase().trim();
    return PROFESSIONS_DB.filter((p) => {
      const matchCat = profCat === 'ALL' || p.cat === profCat;
      const matchText =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.tags.toLowerCase().includes(q) ||
        p.classTitle.toLowerCase().includes(q);
      return matchCat && matchText;
    });
  }, [profSearch, profCat]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !goal.trim()) return;
    playSFX('levelup');
    onCompleteAwakening({
      name,
      gender,
      age,
      height,
      weight,
      city,
      rewardInterest,
      goal,
      targetLevel,
      dailyBudget,
      customProfName: isCustomProf ? customProfName : undefined,
      selectedPreset,
      lang,
    });
  };

  return (
    <section className="max-w-4xl mx-auto pb-8">
      {!isCloudLoggedIn && (
        <div className="mb-4 p-3 rounded-md bg-sky-50 border border-sky-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2.5 text-xs text-sky-900">
            <Cloud className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {lang === 'id'
                  ? 'Sudah punya profil di HP atau Laptop lain?'
                  : 'Already have a profile on another phone or laptop?'}
              </p>
              <p className="text-sky-700">
                {lang === 'id'
                  ? 'Masuk dengan akun Firebase Cloud Sync agar datamu otomatis terbuka & tersinkronisasi real-time.'
                  : 'Sign in with Firebase Cloud Sync to automatically restore and sync your progress in real time.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenCloudLogin}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-sky-700 text-white font-hud font-bold text-xs uppercase tracking-wider flex-shrink-0 btn-anime self-start sm:self-center"
          >
            {lang === 'id' ? 'LOGIN CLOUD SYNC' : 'SIGN IN CLOUD SYNC'}
          </button>
        </div>
      )}

      <div className="anime-panel overflow-hidden">
        <div className="blender-bar px-4 py-2 flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold text-slate-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <span className="truncate">{tr(lang, 'awakeningBarTitle')}</span>
          </span>
          <span className="hidden sm:inline font-mono text-[10px] font-bold text-sky-700 flex-shrink-0">
            ANTI-BIAS SCIENTIFIC ENGINE
          </span>
        </div>

        <div className="p-4 sm:p-7">
          <div className="mb-6">
            <h1 className="font-hud font-bold text-2xl sm:text-3xl text-slate-900 tracking-wide">
              {tr(lang, 'awakeningHeading')}
            </h1>
            <p className="text-sm text-slate-600 mt-1">{tr(lang, 'awakeningDesc')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Step 1: Identity & Biometrics */}
            <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-3">
              <h2 className="font-hud font-bold text-sm text-slate-800 uppercase flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-sky-600" />
                {tr(lang, 'lblSec1')}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {tr(lang, 'lblName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === 'id' ? 'Contoh: Raka / Sinta' : 'Example: Alex / Maya'}
                    className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {tr(lang, 'lblGender')}
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 text-sm"
                  >
                    <option value="male">{tr(lang, 'optMale')}</option>
                    <option value="female">{tr(lang, 'optFemale')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {tr(lang, 'lblAge')}
                  </label>
                  <input
                    type="number"
                    required
                    min={13}
                    max={85}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value) || 24)}
                    className="w-full px-3 py-2 rounded bg-white border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-sky-600 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {tr(lang, 'lblHeight')}
                    </label>
                    <input
                      type="number"
                      required
                      min={120}
                      max={230}
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value) || 170)}
                      className="w-full px-2.5 py-2 rounded bg-white border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-sky-600 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {tr(lang, 'lblWeight')}
                    </label>
                    <input
                      type="number"
                      required
                      min={30}
                      max={220}
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value) || 65)}
                      className="w-full px-2.5 py-2 rounded bg-white border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-sky-600 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {tr(lang, 'lblCity')}
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Surabaya / Jakarta / Bandung / Yogyakarta"
                    className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {tr(lang, 'lblInterest')}
                  </label>
                  <input
                    type="text"
                    value={rewardInterest}
                    onChange={(e) => setRewardInterest(e.target.value)}
                    placeholder={
                      lang === 'id'
                        ? 'Contoh: Kopi, buku, kursus AI gratis, promo gym, tools kerja'
                        : 'Example: Coffee, books, free AI courses, gym promo, dev tools'
                    }
                    className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 text-sm"
                  />
                </div>
              </div>

              {/* Live Biometric Banner */}
              <div className="p-2.5 rounded bg-white border border-sky-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <span className="text-slate-700">
                  {lang === 'id' ? 'IMT / BMI:' : 'BMI:'}{' '}
                  <strong className="text-sky-700">
                    {bioPreview.bmi} ({bioPreview.bmiCategory})
                  </strong>
                </span>
                <span className="text-slate-700">
                  {lang === 'id' ? 'Kalori Basal:' : 'BMR:'}{' '}
                  <strong>
                    {bioPreview.bmr} {lang === 'id' ? 'kkal/hari' : 'kcal/day'}
                  </strong>
                </span>
                <span className="text-slate-700">
                  {lang === 'id' ? 'Target Protein Otot:' : 'Optimal Protein:'}{' '}
                  <strong className="text-emerald-700">
                    {bioPreview.proteinTarget}g / {lang === 'id' ? 'hari' : 'day'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Step 2: Profession Directory */}
            <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="font-hud font-bold text-sm text-slate-800 uppercase flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-orange-600" />
                  {tr(lang, 'lblSec2')}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsCustomProf((v) => !v)}
                  className="text-xs font-bold text-sky-700 hover:text-sky-900 underline self-start sm:self-auto"
                >
                  {isCustomProf ? tr(lang, 'btnPickFromList') : tr(lang, 'btnCustomProf')}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={profSearch}
                    onChange={(e) => setProfSearch(e.target.value)}
                    placeholder={tr(lang, 'searchPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 rounded bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>
                <select
                  value={profCat}
                  onChange={(e) => setProfCat(e.target.value as typeof profCat)}
                  className="px-3 py-2 rounded bg-white border border-slate-300 text-xs font-bold text-slate-700 focus:outline-none focus:border-sky-600"
                >
                  <option value="ALL">{tr(lang, 'catAll')}</option>
                  <option value="AGRI">{tr(lang, 'catAgri')}</option>
                  <option value="BIZ">{tr(lang, 'catBiz')}</option>
                  <option value="TECH">{tr(lang, 'catTech')}</option>
                  <option value="EDU">{tr(lang, 'catEdu')}</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {filteredProfessions.length === 0 ? (
                  <div className="col-span-full text-center py-4 text-xs text-slate-500">
                    {lang === 'id'
                      ? 'Tidak ditemukan. Klik "+ Tulis Profesi Lain" di atas!'
                      : 'Not found. Click "+ Write Custom Role" above!'}
                  </div>
                ) : (
                  filteredProfessions.map((p) => {
                    const isSelected = !isCustomProf && selectedPreset.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setIsCustomProf(false);
                          setSelectedPreset(p);
                          playSFX('click');
                        }}
                        className={`text-left p-2.5 rounded border transition ${
                          isSelected
                            ? 'bg-sky-50 border-sky-600 ring-1 ring-sky-600'
                            : 'bg-white border-slate-300 hover:border-sky-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-orange-400">
                            {p.cat}
                          </span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />}
                        </div>
                        <p className="font-hud font-bold text-xs text-slate-900 mt-1 leading-snug">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{p.classTitle}</p>
                      </button>
                    );
                  })
                )}
              </div>

              {isCustomProf && (
                <div className="pt-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {tr(lang, 'lblCustomProf')}
                  </label>
                  <input
                    type="text"
                    required={isCustomProf}
                    value={customProfName}
                    onChange={(e) => setCustomProfName(e.target.value)}
                    placeholder={
                      lang === 'id'
                        ? 'Contoh: Arsitek Lanskap / Konten Kreator Kuliner'
                        : 'Example: Landscape Architect / Culinary Creator'
                    }
                    className="w-full px-3 py-2 rounded bg-white border border-sky-400 text-sm text-slate-900 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Step 3: Dream Goal */}
            <div>
              <label className="block font-bold text-xs text-slate-700 mb-1">
                {tr(lang, 'lblGoal')}
              </label>
              <p className="text-xs text-slate-500 mb-1.5">{tr(lang, 'lblGoalHint')}</p>
              <input
                type="text"
                required
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder={tr(lang, 'goalPlaceholder')}
                className="w-full px-3.5 py-2.5 rounded bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-600 transition text-sm font-medium"
              />
            </div>

            {/* Step 4 & 5: Target Level & Daily Commitment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-sky-50/70 p-3.5 rounded border border-sky-200">
              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  {tr(lang, 'lblTargetLevel')}
                </label>
                <select
                  value={targetLevel}
                  onChange={(e) => setTargetLevel(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 text-xs font-bold"
                >
                  <option value={10}>{tr(lang, 'optLvl10')}</option>
                  <option value={15}>{tr(lang, 'optLvl15')}</option>
                  <option value={20}>{tr(lang, 'optLvl20')}</option>
                  <option value={25}>{tr(lang, 'optLvl25')}</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  {tr(lang, 'lblDailyBudget')}
                </label>
                <select
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 text-xs font-bold"
                >
                  <option value={90}>{tr(lang, 'optTime90')}</option>
                  <option value={150}>{tr(lang, 'optTime150')}</option>
                  <option value={240}>{tr(lang, 'optTime240')}</option>
                </select>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                className="w-full py-3.5 px-6 bg-slate-900 hover:bg-sky-700 text-white font-hud font-bold text-base uppercase tracking-widest btn-anime shadow-md flex items-center justify-center gap-2"
              >
                <span>{tr(lang, 'btnStartJourney')}</span>
                <ChevronRight className="w-5 h-5 text-orange-400" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};
