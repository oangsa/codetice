Created At: 2026-06-17T16:00:59Z
Completed At: 2026-06-17T16:00:59Z
File Path: `file:///Users/martin/project/codetice/components/classrooms/question-table.tsx`
Total Lines: 464
Total Bytes: 17405
Showing lines 170 to 280
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
170: 
171:       if (!response.ok) {
172:         const errorData = await response.json();
173:         throw new Error(errorData.message || "Failed to delete question.");
174:       }
175: 
176:       toast.success("Question deleted successfully.");
177:       router.refresh();
178:     } catch (err) {
179:       toast.error(err instanceof Error ? err.message : "Failed to delete question.");
180:     }
181:   }
182: 
183:   const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
184:   const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
185: 
186:   return (
187:     <div className="space-y-3">
188:       {/* Toolbar */}
189:       <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
190:         <div className="flex flex-wrap items-center gap-3">
191:           <p className="text-sm font-semibold text-slate-700 mr-1">
192:             Questions ({filtered.length})
193:           </p>
194:           <div className="relative">
195:             <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
196:             <Input
197:               placeholder="Search by name"
198:               value={search}
199:               onChange={(e) => {
200:                 setSearch(e.target.value);
201:                 setPage(1);
202:               }}
203:               className="w-48 pl-8 h-9 bg-white shadow-sm"
204:             />
205:           </div>
206: 
207:           <Button
208:         
<truncated 1065 bytes>
               {editMode ? "Edit Mode: ON" : "Edit Mode: OFF"}
235:               </Button>
236:               <Button
237:                 asChild
238:                 size="sm"
239:                 className="h-9 !text-primary-foreground hover:!text-primary-foreground"
240:               >
241:                 <Link href={`/classrooms/${classroomId}/questions/new`}>
242:                   <Plus className="h-4 w-4" />
243:                   Add question
244:                 </Link>
245:               </Button>
246:             </div>
247:           ) : null}
248:         </div>
249:       </div>
250: 
251:       {/* Active Filter Badges */}
252:       {activeFilterCount > 0 && (
253:         <div className="flex flex-wrap items-center gap-2 py-1">
254:           <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
255:             Filters:
256:           </span>
257:           {activeFilters.map(({ displayValue, field }) => (
258:             <Button
259:               key={field.key}
260:               variant="outline"
261:               size="sm"
262:               className="h-7 text-xs gap-1.5 rounded-full px-3 text-slate-700 border-slate-200"
263:               onClick={() => handleClearSingleFilter(field.key)}
264:             >
265:               <span>
266:                 {field.label}: {displayValue}
267:               </span>
268:               <X className="h-3 w-3 text-slate-400 hover:text-slate-600" />
269:             </Button>
270:           ))}
271:           <Button
272:             variant="ghost"
273:             size="sm"
274:             className="h-7 text-xs px-2 text-slate-500 hover:text-slate-950"
275:             onClick={handleResetFilters}
276:           >
277:             Clear all
278:           </Button>
279:         </div>
280:       )}
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.
