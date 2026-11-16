# youtube-dl-front

A frontend application for downloading videos from supported platforms (YouTube, Facebook, TikTok) in various formats.

## Language

**Source URL**:
A supported platform URL submitted by the user for download. Must be from YouTube, Facebook, or TikTok.
_Avoid_: Link, video URL, input URL

**Output Profile**:
A preset that defines the format, quality, and constraints of the downloaded media. Each profile specifies file extension, MIME type, and processing behavior (e.g., WhatsApp Video re-encodes to fit size limits).
_Avoid_: Format, preset, quality setting, download type

**Job**:
A server-side processing unit that tracks the conversion of a source URL into a downloadable file. Identified by a codec URL ID, reports progress (0-100%) and status (success, running, error).
_Avoid_: Task, request, download ID, processing unit

**Upload**:
A completed file record that the user can download. Created when a Job finishes successfully, linked to the Job via the codec URL identifier. Represents the actual file stored on the server.
_Avoid_: File, download, result, output

**Download**:
The full user-facing lifecycle from URL submission through file save. Encompasses job creation, progress polling, upload resolution, and the final save to the user's device.
_Avoid_: Task, operation, process, transfer

**Platform**:
A supported video hosting service from which content can be downloaded. Currently YouTube, Facebook, and TikTok.
_Avoid_: Site, service, source, provider
