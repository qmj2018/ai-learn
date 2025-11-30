import torch
def print_cuda_info():
  if torch.cuda.is_available():
    print('cuda is true')
  else:
    print('no no')

print_cuda_info()
