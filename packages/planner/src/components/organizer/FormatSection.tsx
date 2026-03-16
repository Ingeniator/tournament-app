import { useTranslation, FormatPicker, getPresetByFormat, formatHasGroups, formatHasClubs, formatHasFixedPartners, NO_COLOR, CLUB_COLORS, getClubColor, RANK_COLORS, getRankColor, cycleColor, Button, generateId } from '@padel/common';
import type { PlannerTournament, PlannerRegistration, Club, ChaosLevel } from '@padel/common';
import { CollapsibleSection } from './CollapsibleSection';
import { EditableItem } from './EditableItem';
import styles from '../../screens/OrganizerScreen.module.css';

interface FormatSectionProps {
  tournament: PlannerTournament;
  players: PlannerRegistration[];
  capacity: number;
  updateTournament: (updates: Record<string, unknown>) => Promise<void>;
}

export function FormatSection({ tournament, players, capacity, updateTournament }: FormatSectionProps) {
  const { t } = useTranslation();

  const formatPreset = getPresetByFormat(tournament.format);
  const formatLabel = formatPreset ? t(formatPreset.nameKey) : t('organizer.formatMexicano');

  return (
    <CollapsibleSection
      title={t('organizer.formatSection')}
      summary={formatLabel}
      defaultOpen={false}
    >
      <div className={styles.configGrid}>
        <div className={styles.configFullWidth}>
        <label className={styles.configLabel}>
          {t('organizer.format')}
        </label>
        <FormatPicker
          format={tournament.format}
          onChange={(format) => {
            updateTournament({ format });
          }}
          t={t}
        />
        </div>
      </div>

      {formatHasGroups(tournament.format) && (
        <div className={styles.groupLabelsSection}>
          <span className={styles.groupLabelsTitle}>{t('organizer.groupLabels')}</span>
          <div className={styles.groupLabelsRow}>
            <input
              className={styles.groupLabelInput}
              type="text"
              value={tournament.groupLabels?.[0] ?? ''}
              onChange={e => {
                const labels: [string, string] = [e.target.value, tournament.groupLabels?.[1] ?? ''];
                updateTournament({ groupLabels: labels[0] || labels[1] ? labels : undefined });
              }}
              placeholder={t('organizer.groupLabelAPlaceholder')}
            />
            <input
              className={styles.groupLabelInput}
              type="text"
              value={tournament.groupLabels?.[1] ?? ''}
              onChange={e => {
                const labels: [string, string] = [tournament.groupLabels?.[0] ?? '', e.target.value];
                updateTournament({ groupLabels: labels[0] || labels[1] ? labels : undefined });
              }}
              placeholder={t('organizer.groupLabelBPlaceholder')}
            />
          </div>
        </div>
      )}

      {formatHasClubs(tournament.format) && (() => {
        const clubs = tournament.clubs ?? [];
        return (
          <div className={styles.clubsSection}>
            <div className={styles.courtsHeader}>
              <span>{t('organizer.clubs', { count: clubs.length })}</span>
              <Button variant="ghost" size="small" onClick={() => {
                const usedColors = new Set(clubs.map((c, i) => getClubColor(c, i)));
                const freeColor = CLUB_COLORS.find(c => c !== NO_COLOR && !usedColors.has(c)) ?? CLUB_COLORS[clubs.length % (CLUB_COLORS.length - 1)];
                const newClubs: Club[] = [...clubs, { id: generateId(), name: `Club ${clubs.length + 1}`, color: freeColor }];
                updateTournament({ clubs: newClubs });
              }}>{t('organizer.addClub')}</Button>
            </div>
            {clubs.map((club, idx) => {
              const currentClubIdx = CLUB_COLORS.indexOf(getClubColor(club, idx));
              const usedClubIndices = new Set(
                clubs.map((c, i) => i !== idx ? CLUB_COLORS.indexOf(getClubColor(c, i)) : -1).filter(i => i >= 0)
              );
              return (
              <EditableItem
                key={club.id}
                name={club.name}
                onChange={name => {
                  const updated = clubs.map(c =>
                    c.id === club.id ? { ...c, name } : c
                  );
                  updateTournament({ clubs: updated });
                }}
                onRemove={clubs.length > 2 ? () => {
                  const updated = clubs.filter(c => c.id !== club.id);
                  updateTournament({ clubs: updated });
                } : undefined}
                icon={
                  <button
                    className={`${styles.clubDot} ${getClubColor(club, idx) === NO_COLOR ? styles.noColorDot : ''}`}
                    style={getClubColor(club, idx) !== NO_COLOR ? { backgroundColor: getClubColor(club, idx) } : undefined}
                    onClick={() => {
                      const nextIdx = cycleColor(CLUB_COLORS, currentClubIdx >= 0 ? currentClubIdx : idx, usedClubIndices);
                      const updated = clubs.map(c =>
                        c.id === club.id ? { ...c, color: CLUB_COLORS[nextIdx] } : c
                      );
                      updateTournament({ clubs: updated });
                    }}
                  />
                }
                subtitle={tournament.captainMode ? (
                  <div className={styles.captainRow}>
                    <span className={styles.captainLabel}>{t('organizer.clubCaptain')}:</span>
                    <select
                      className={styles.captainSelect}
                      value={club.captainId ? `player:${club.captainId}` : club.captainTelegram !== undefined ? 'telegram' : 'none'}
                      onChange={e => {
                        const val = e.target.value;
                        const updatedClubs = [...clubs];
                        if (val === 'none') {
                          const { captainId: _, captainTelegram: __, ...rest } = club;
                          updatedClubs[idx] = rest;
                        } else if (val === 'telegram') {
                          const { captainId: _, ...rest } = club;
                          updatedClubs[idx] = { ...rest, captainTelegram: club.captainTelegram ?? '' };
                        } else if (val.startsWith('player:')) {
                          const playerId = val.slice('player:'.length);
                          const { captainTelegram: _, ...rest } = club;
                          updatedClubs[idx] = { ...rest, captainId: playerId };
                        }
                        updateTournament({ clubs: updatedClubs });
                      }}
                    >
                      <option value="none">{t('organizer.setCaptain')}</option>
                      {players.filter(p => p.clubId === club.id).map(p => (
                        <option key={p.id} value={`player:${p.id}`}>{p.name}</option>
                      ))}
                      <option value="telegram">{t('organizer.startDelegateTelegram')}</option>
                    </select>
                    {(!club.captainId && club.captainTelegram != null) && (
                      <input
                        className={styles.captainTgInput}
                        type="text"
                        value={club.captainTelegram ? `@${club.captainTelegram}` : ''}
                        onChange={e => {
                          const raw = e.target.value.replace(/^@/, '');
                          const updatedClubs = [...clubs];
                          const { captainTelegram: _, ...rest } = club;
                          updatedClubs[idx] = raw ? { ...rest, captainTelegram: raw } : rest;
                          updateTournament({ clubs: updatedClubs });
                        }}
                        placeholder={t('organizer.startDelegateTelegramPlaceholder')}
                      />
                    )}
                  </div>
                ) : undefined}
              />
              );
            })}
            {clubs.length === 0 && (
              <p className={styles.empty}>{t('organizer.noClub')}</p>
            )}
            {tournament.format === 'club-ranked' && clubs.length >= 2 && (() => {
              const slotsPerClub = Math.floor(capacity / clubs.length);
              const maxRanks = Math.max(2, Math.floor(slotsPerClub / 2));
              return (
                <div className={styles.rankLabelsSection}>
                  <span className={styles.rankLabelsTitle}>{t('organizer.rankLabels')}</span>
                  <div className={styles.rankLabelsColumn}>
                    {Array.from({ length: maxRanks }, (_, i) => {
                      const customIdx = tournament.rankColors?.[i];
                      const rc = getRankColor(i, customIdx);
                      return (
                        <div key={i} className={styles.rankLabelRow}>
                          <button
                            type="button"
                            className={`${styles.rankDot} ${rc.bg === NO_COLOR ? styles.noColorDot : ''}`}
                            style={rc.bg !== NO_COLOR ? { backgroundColor: rc.bg, borderColor: rc.border } : undefined}
                            onClick={() => {
                              const colors = [...(tournament.rankColors ?? Array.from({ length: maxRanks }, (__, j) => j))];
                              const current = colors[i] ?? i;
                              const usedByOthers = new Set(
                                colors.map((c, j) => j !== i ? c : -1).filter(c => c >= 0)
                              );
                              colors[i] = cycleColor(RANK_COLORS, current, usedByOthers);
                              updateTournament({ rankColors: colors });
                            }}
                          />
                          <input
                            className={styles.rankLabelInput}
                            type="text"
                            value={tournament.rankLabels?.[i] ?? ''}
                            onChange={e => {
                              const labels = [...(tournament.rankLabels ?? [])];
                              labels[i] = e.target.value;
                              // Trim trailing empty strings
                              while (labels.length > 0 && !labels[labels.length - 1]) labels.pop();
                              updateTournament({ rankLabels: labels.length > 0 ? labels : undefined });
                            }}
                            placeholder={t('organizer.rankLabelPlaceholder', { num: i + 1 })}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* Modes subsection */}
      {formatHasFixedPartners(tournament.format) && (
        <>
          <div className={styles.modesSubtitle}>{t('organizer.modesSubtitle')}</div>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={tournament.maldiciones?.enabled ?? false}
              onChange={e => {
                updateTournament({
                  maldiciones: e.target.checked
                    ? { enabled: true, chaosLevel: tournament.maldiciones?.chaosLevel ?? 'medium' }
                    : undefined,
                });
              }}
            />
            <span>{t('organizer.maldicionesEnabled')}</span>
          </label>
          <span className={styles.hint}>{t('organizer.maldicionesHint')}</span>
          {tournament.maldiciones?.enabled && (
            <div className={styles.configGrid}>
              <label className={styles.configLabel}>{t('organizer.chaosLevel')}</label>
              <select
                className={styles.select}
                value={tournament.maldiciones.chaosLevel}
                onChange={e => updateTournament({
                  maldiciones: { enabled: true, chaosLevel: e.target.value as ChaosLevel },
                })}
              >
                <option value="lite">{t('organizer.chaosLite')}</option>
                <option value="medium">{t('organizer.chaosMedium')}</option>
                <option value="hardcore">{t('organizer.chaosHardcore')}</option>
              </select>
            </div>
          )}
        </>
      )}
      {formatHasClubs(tournament.format) && (
        <>
          {!formatHasFixedPartners(tournament.format) && <div className={styles.modesSubtitle}>{t('organizer.modesSubtitle')}</div>}
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={tournament.captainMode ?? false}
              onChange={e => updateTournament({ captainMode: e.target.checked || undefined })}
            />
            <span>{t('organizer.captainMode')}</span>
          </label>
          <span className={styles.hint}>{t('organizer.captainModeHint')}</span>
        </>
      )}
      {tournament.format === 'club-ranked' && (() => {
        const clubCount = (tournament.clubs ?? []).length;
        const minCapacity = clubCount * 2 * 2;
        if (clubCount >= 2 && capacity < minCapacity) {
          return (
            <div className={styles.matchWarning}>
              <div className={styles.matchWarningTitle}>{t('organizer.rankCapacityWarningTitle')}</div>
              <div className={styles.matchWarningBody}>
                {t('organizer.rankCapacityWarningBody', { capacity, minCapacity, courts: Math.ceil(minCapacity / 4) })}
              </div>
            </div>
          );
        }
        return null;
      })()}
    </CollapsibleSection>
  );
}
